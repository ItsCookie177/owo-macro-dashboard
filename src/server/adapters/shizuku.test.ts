import { EventEmitter } from 'node:events';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { shellQuote, ShizukuAdapter, type SpawnFn } from './shizuku.js';

class FakeProc extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = {
    write: (s: string) => {
      this.onInput(s);
    },
  };
  exitCode: number | null = null;
  killed = false;
  constructor(private readonly onInput: (s: string) => void) {
    super();
  }
  kill(): void {
    this.killed = true;
    this.exitCode = 137;
    this.emit('exit', 137);
  }
}

type Script = (cmd: string) => [string, number];

function fakeRishSpawn(script: Script): SpawnFn {
  return (() => {
    const proc = new FakeProc((input: string) => {
      for (const line of input.split('\n')) {
        const t = line.trim();
        if (!t) continue;
        const ready = t.match(/^echo (__OWO_READY_\w+)$/);
        if (ready) {
          setImmediate(() =>
            proc.stdout.emit('data', Buffer.from(ready[1] + '\n')),
          );
          continue;
        }
        const m = t.match(/^(.*); echo "(__OWO_EXIT_\w+):(\$\?|\d+)"$/);
        if (m) {
          const [, cmd, sentinel] = m;
          setImmediate(() => {
            const [out, exitCode] = script(cmd);
            const text = (out ? out + '\n' : '') + sentinel + ':' + exitCode + '\n';
            proc.stdout.emit('data', Buffer.from(text));
          });
        }
      }
    });
    return proc;
  }) as unknown as SpawnFn;
}

function tempRish(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'owo-rish-'));
  const p = path.join(dir, 'rish');
  writeFileSync(p, '#!/bin/sh\necho fake\n', 'utf8');
  return p;
}

const DISCORD_DUMP =
  '  mCurrentFocus=Window{abc123 u0 com.discord/com.discord.main.MainActivity}\n';

describe('shellQuote', () => {
  it('membungkus teks biasa', () => {
    expect(shellQuote('owo')).toBe("'owo'");
  });
  it('escape kutip', () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });
});

describe('ShizukuAdapter', () => {
  it('isAvailable true saat handshake + echo ok sukses', async () => {
    const adapter = new ShizukuAdapter(tempRish(), fakeRishSpawn((cmd) => {
      if (cmd === 'echo ok') return ['ok', 0];
      return ['', 0];
    }));
    await expect(adapter.isAvailable()).resolves.toBe(true);
    await adapter.dispose();
  });

  it('isAvailable false kalau rish path tidak ada', async () => {
    const adapter = new ShizukuAdapter('/nonexistent/rish', fakeRishSpawn(() => ['', 0]));
    await expect(adapter.isAvailable()).resolves.toBe(false);
  });

  it('checkForeground parse dumpsys Discord', async () => {
    const adapter = new ShizukuAdapter(tempRish(), fakeRishSpawn((cmd) => {
      if (cmd.startsWith('dumpsys window')) return [DISCORD_DUMP, 0];
      return ['', 0];
    }));
    await expect(adapter.checkForeground()).resolves.toBe(true);
    await adapter.dispose();
  });

  it('checkForeground false kalau app lain', async () => {
    const adapter = new ShizukuAdapter(tempRish(), fakeRishSpawn((cmd) => {
      if (cmd.startsWith('dumpsys window'))
        return ['mCurrentFocus=Window{x u0 com.android.settings/.Settings}', 0];
      return ['', 0];
    }));
    await expect(adapter.checkForeground()).resolves.toBe(false);
    await adapter.dispose();
  });

  it('sendCommand mengetik per-segmen + ENTER', async () => {
    const commands: string[] = [];
    const adapter = new ShizukuAdapter(tempRish(), fakeRishSpawn((cmd) => {
      commands.push(cmd);
      return ['', 0];
    }));
    await adapter.sendCommand('owo cf 100');
    expect(commands).toEqual([
      "input text 'owo'",
      'input keyevent 62',
      "input text 'cf'",
      'input keyevent 62',
      "input text '100'",
      'input keyevent 66',
    ]);
    await adapter.dispose();
  });

  it('error exit code melempar', async () => {
    const adapter = new ShizukuAdapter(tempRish(), fakeRishSpawn((cmd) => {
      if (cmd.startsWith('input text')) return ['Killed', 137];
      return ['', 0];
    }));
    await expect(adapter.sendCommand('owo hunt')).rejects.toThrow(/exit 137/);
    await adapter.dispose();
  });

  it('clearComposer kirim ESC + 3 DEL', async () => {
    const commands: string[] = [];
    const adapter = new ShizukuAdapter(tempRish(), fakeRishSpawn((cmd) => {
      commands.push(cmd);
      return ['', 0];
    }));
    await adapter.clearComposer();
    expect(commands.filter((c) => c.includes('keyevent 111'))).toHaveLength(1);
    expect(commands.filter((c) => c.includes('keyevent 67'))).toHaveLength(3);
    await adapter.dispose();
  });
});
