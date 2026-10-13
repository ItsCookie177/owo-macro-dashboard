import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams, SpawnOptions } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { isDiscordForeground, isDiscordVisible } from './target.js';
import type { AutomationAdapter } from './types.js';

export type SpawnFn = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => ChildProcessWithoutNullStreams;

const DEFAULT_TIMEOUT_MS = 15_000;
const HANDSHAKE_TIMEOUT_MS = 20_000;

export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function defaultRishPath(): string {
  const candidates = [
    process.env.RISH_PATH,
    path.join(os.homedir(), 'rish'),
    path.join(os.homedir(), 'bin', 'rish'),
    path.join(process.cwd(), 'rish'),
  ].filter((p): p is string => Boolean(p));
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0] ?? path.join(os.homedir(), 'rish');
}

/**
 * Adapter Shizuku: satu sesi `rish` persistent.
 * Protocol: tulis `<cmd>; echo "__OWO_EXIT_<id>:$?"` ke stdin,
 * kumpulkan stdout sampai baris sentinel, lalu parse exit code.
 */
export class ShizukuAdapter implements AutomationAdapter {
  readonly name = 'shizuku' as const;
  private proc: ChildProcessWithoutNullStreams | null = null;
  private buffer = '';
  private pending:
    | {
        resolve: (v: { stdout: string; code: number }) => void;
        reject: (e: Error) => void;
        sentinel: string;
        stderr: string;
      }
    | null = null;
  private starting: Promise<void> | null = null;
  private restartUsed = false;

  constructor(
    private readonly rishPath: string = defaultRishPath(),
    private readonly spawnFn: SpawnFn = spawn as SpawnFn,
  ) {}

  private ensureSession(): Promise<void> {
    if (this.proc && this.proc.exitCode === null && !this.proc.killed) {
      return Promise.resolve();
    }
    if (this.starting) return this.starting;

    this.starting = new Promise((resolve, reject) => {
      let settled = false;
      const done = (err?: Error) => {
        if (settled) return;
        settled = true;
        this.starting = null;
        if (err) reject(err);
        else resolve();
      };

      let proc: ChildProcessWithoutNullStreams;
      try {
        proc = this.spawnFn(this.rishPath, [], {
          env: {
            ...process.env,
            RISH_APPLICATION_ID: 'com.termux',
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        }) as ChildProcessWithoutNullStreams;
      } catch (e) {
        done(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      this.proc = proc;
      this.buffer = '';

      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        this.proc = null;
        done(new Error('rish tidak merespons (timeout handshake)'));
      }, HANDSHAKE_TIMEOUT_MS);

      proc.stdout.on('data', (chunk: Buffer) => {
        this.buffer += chunk.toString();
        this.handleData();
      });
      let stderr = '';
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      proc.on('error', (err) => {
        clearTimeout(timer);
        this.proc = null;
        if (this.pending) {
          this.pending.reject(err);
          this.pending = null;
        }
        done(err);
      });
      proc.on('exit', () => {
        clearTimeout(timer);
        this.proc = null;
        if (this.pending) {
          this.pending.reject(new Error('rish berhenti'));
          this.pending = null;
        }
        if (!settled) {
          done(new Error(`rish keluar saat handshake: ${stderr.slice(0, 200)}`));
        }
      });

      // handshake: tunggu shell merespons
      const id = randomBytes(4).toString('hex');
      const sentinel = `__OWO_READY_${id}`;
      this.pending = {
        sentinel,
        stderr: '',
        resolve: ({ stdout }) => {
          clearTimeout(timer);
          if (stdout.includes('not found') || /permission denied/i.test(stdout)) {
            done(new Error(`rish handshake gagal: ${stdout.slice(0, 200)}`));
          } else {
            done();
          }
        },
        reject: (err) => {
          clearTimeout(timer);
          done(err);
        },
      };
      proc.stdin.write(`echo ${sentinel}\n`);
    });

    return this.starting;
  }

  private handleData(): void {
    if (!this.pending) return;
    const { sentinel } = this.pending;
    const idx = this.buffer.indexOf(sentinel);
    if (idx === -1) return;
    const lineEnd = this.buffer.indexOf('\n', idx);
    if (lineEnd === -1) return;
    const before = this.buffer.slice(0, idx);
    const rest = this.buffer.slice(lineEnd + 1);
    const afterLine = this.buffer.slice(idx, lineEnd);
    const exitMatch = afterLine.match(/:(\d+)\s*$/);
    const code = exitMatch ? Number(exitMatch[1]) : 0;
    const pending = this.pending;
    this.pending = null;
    this.buffer = rest;
    pending.resolve({ stdout: before.trimEnd(), code });
  }

  private async run(cmd: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
    await this.ensureSession();
    const proc = this.proc;
    if (!proc) throw new Error('rish tidak tersedia');

    const id = randomBytes(4).toString('hex');
    const sentinel = `__OWO_EXIT_${id}:`;

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending?.sentinel.startsWith(sentinel)) this.pending = null;
        this.killSession();
        reject(new Error(`timeout menjalankan: ${cmd.slice(0, 80)}`));
      }, timeoutMs);

      this.pending = {
        sentinel,
        stderr: '',
        resolve: ({ stdout, code }) => {
          clearTimeout(timer);
          if (code !== 0) {
            reject(
              new Error(`perintah gagal (exit ${code}): ${cmd.slice(0, 80)} — ${stdout.slice(0, 200)}`),
            );
            return;
          }
          resolve(stdout);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      };
      proc.stdin.write(`${cmd}; echo "${sentinel}$?"\n`);
    });
  }

  private killSession(): void {
    const proc = this.proc;
    this.proc = null;
    this.restartUsed = false;
    try {
      proc?.kill('SIGKILL');
    } catch {
      /* abaikan */
    }
  }

  private async runWithRestart(cmd: string, timeoutMs?: number): Promise<string> {
    try {
      return await this.run(cmd, timeoutMs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (this.restartUsed || !/berhenti|tidak tersedia|timeout/.test(msg)) {
        throw e;
      }
      this.restartUsed = true;
      this.killSession();
      return this.run(cmd, timeoutMs);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!existsSync(this.rishPath)) return false;
    try {
      await this.ensureSession();
      const out = await this.run('echo ok', 30_000);
      return out.includes('ok');
    } catch {
      return false;
    }
  }

  async checkForeground(): Promise<boolean> {
    const out = await this.runWithRestart(
      'dumpsys window 2>/dev/null | grep -E "mCurrentFocus|mFocusedApp"',
    );
    return isDiscordForeground(out);
  }

  async checkVisible(): Promise<boolean> {
    const out = await this.runWithRestart('dumpsys window windows 2>/dev/null', 20_000);
    return isDiscordVisible(out);
  }

  async sendCommand(text: string): Promise<void> {
    const parts = text.split(/\s+/).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      await this.runWithRestart(`input text ${shellQuote(parts[i])}`);
      if (i < parts.length - 1) {
        await this.runWithRestart('input keyevent 62'); // SPACE
      }
    }
    await this.runWithRestart('input keyevent 66'); // ENTER
  }

  async clearComposer(): Promise<void> {
    try {
      await this.runWithRestart('input keyevent 111'); // ESC
      for (let i = 0; i < 3; i++) {
        await this.runWithRestart('input keyevent 67'); // DEL
      }
    } catch {
      /* best effort */
    }
  }

  async dumpUi(): Promise<string> {
    let lastErr: Error | null = null;
    for (let i = 0; i < 3; i++) {
      try {
        const out = await this.runWithRestart(
          'rm -f /sdcard/owo_ui.xml; uiautomator dump /sdcard/owo_ui.xml 2>&1; cat /sdcard/owo_ui.xml 2>/dev/null',
          30_000,
        );
        if (out.includes('<hierarchy') || out.includes('<node')) return out;
        lastErr = new Error(`dump tidak berisi hierarchy: ${out.slice(0, 120)}`);
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw lastErr ?? new Error('uiautomator dump gagal');
  }

  async dispose(): Promise<void> {
    this.killSession();
  }
}
