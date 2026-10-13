import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { isDiscordForeground, isDiscordVisible } from './target.js';
import { shellQuote, type SpawnFn } from './shizuku.js';
import type { AutomationAdapter } from './types.js';

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Adapter ADB wireless: satu-shot `adb -s <serial> shell <cmd>` per aksi.
 * Serial: env ADB_SERIAL, atau auto-pick device pertama berstatus "device".
 */
export class AdbAdapter implements AutomationAdapter {
  readonly name = 'adb' as const;
  private serial: string | null = null;

  constructor(private readonly spawnFn: SpawnFn = spawn as SpawnFn) {}

  private runAdb(args: string[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let proc: ChildProcessWithoutNullStreams;
      try {
        proc = this.spawnFn('adb', args, {
          stdio: ['ignore', 'pipe', 'pipe'],
        }) as ChildProcessWithoutNullStreams;
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
        return;
      }

      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`timeout: adb ${args.join(' ')}`));
      }, timeoutMs);

      proc.stdout.on('data', (c: Buffer) => {
        stdout += c.toString();
      });
      proc.stderr.on('data', (c: Buffer) => {
        stderr += c.toString();
      });
      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      proc.on('exit', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve(stdout.trimEnd());
        } else {
          const detail = (stdout + stderr).trim().slice(0, 300);
          reject(
            new Error(`adb ${args.join(' ')} exit ${code}: ${detail || 'gagal'}`),
          );
        }
      });
    });
  }

  private async resolveSerial(): Promise<string> {
    if (this.serial) return this.serial;
    if (process.env.ADB_SERIAL) {
      this.serial = process.env.ADB_SERIAL;
      return this.serial;
    }
    const out = await this.runAdb(['devices'], 10_000);
    for (const line of out.split('\n').slice(1)) {
      const [sn, state] = line.trim().split(/\s+/);
      if (sn && state === 'device') {
        this.serial = sn;
        return sn;
      }
    }
    throw new Error('tidak ada device adb berstatus "device"');
  }

  private async run(cmd: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
    const serial = await this.resolveSerial();
    try {
      return await this.runAdb(['-s', serial, 'shell', cmd], timeoutMs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/offline|not found|no devices/i.test(msg)) {
        // serial basi — resolve ulang sekali
        this.serial = null;
        const fresh = await this.resolveSerial();
        return this.runAdb(['-s', fresh, 'shell', cmd], timeoutMs);
      }
      throw e;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const out = await this.run('echo ok', 10_000);
      return out.includes('ok');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/unauthorized/i.test(msg)) {
        console.warn(
          '[adb] device unauthorized — buka layar HP, izinkan "Allow USB debugging"',
        );
      }
      return false;
    }
  }

  async checkForeground(): Promise<boolean> {
    const out = await this.run(
      'dumpsys window 2>/dev/null | grep -E "mCurrentFocus|mFocusedApp"',
    );
    return isDiscordForeground(out);
  }

  async checkVisible(): Promise<boolean> {
    const out = await this.run('dumpsys window windows 2>/dev/null', 20_000);
    return isDiscordVisible(out);
  }

  async sendCommand(text: string): Promise<void> {
    const parts = text.split(/\s+/).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      await this.run(`input text ${shellQuote(parts[i])}`);
      if (i < parts.length - 1) {
        await this.run('input keyevent 62'); // SPACE
      }
    }
    await this.run('input keyevent 66'); // ENTER
  }

  async clearComposer(): Promise<void> {
    try {
      await this.run('input keyevent 111'); // ESC
      for (let i = 0; i < 3; i++) {
        await this.run('input keyevent 67'); // DEL
      }
    } catch {
      /* best effort */
    }
  }

  async dumpUi(): Promise<string> {
    let lastErr: Error | null = null;
    for (let i = 0; i < 3; i++) {
      try {
        const out = await this.run(
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

  async dispose(): Promise<void> {}
}
