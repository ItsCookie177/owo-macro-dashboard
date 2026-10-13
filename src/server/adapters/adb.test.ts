import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { AdbAdapter } from './adb.js';
import type { SpawnFn } from './shizuku.js';

class FakeAdbProc extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = { write: () => {} };
  exitCode: number | null = null;
  killed = false;
  kill(): void {
    this.killed = true;
    this.exitCode = 137;
    this.emit('exit', 137);
  }
}

function fakeAdbSpawn(script: (cmd: string) => [string, number]): SpawnFn {
  return ((cmd: string, args: string[]) => {
    const proc = new FakeAdbProc();
    if (cmd === 'adb') {
      setImmediate(() => {
        if (args[0] === 'devices') {
          proc.stdout.emit(
            'data',
            Buffer.from('List of devices attached\n127.0.0.1:5555\tdevice\n'),
          );
          proc.emit('exit', 0);
          return;
        }
        if (args[0] === '-s' && args[2] === 'shell') {
          const shellCmd = args[3] ?? '';
          const [out, code] = script(shellCmd);
          if (out) proc.stdout.emit('data', Buffer.from(out + '\n'));
          proc.exitCode = code;
          proc.emit('exit', code);
          return;
        }
        proc.emit('exit', 0);
      });
    }
    return proc;
  }) as unknown as SpawnFn;
}

const DISCORD_DUMP =
  'mCurrentFocus=Window{abc u0 com.discord/com.discord.main.MainActivity}';

describe('AdbAdapter', () => {
  it('isAvailable true saat echo ok', async () => {
    const adapter = new AdbAdapter(
      fakeAdbSpawn((cmd) => (cmd === 'echo ok' ? ['ok', 0] : ['', 0])),
    );
    await expect(adapter.isAvailable()).resolves.toBe(true);
  });

  it('isAvailable false saat unauthorized', async () => {
    const adapter = new AdbAdapter(
      fakeAdbSpawn(() => ['adb: device unauthorized', 1]),
    );
    await expect(adapter.isAvailable()).resolves.toBe(false);
  });

  it('checkForeground parse Discord', async () => {
    const adapter = new AdbAdapter(
      fakeAdbSpawn((cmd) =>
        cmd.startsWith('dumpsys window') ? [DISCORD_DUMP, 0] : ['', 0],
      ),
    );
    await expect(adapter.checkForeground()).resolves.toBe(true);
  });

  it('sendCommand: segment + keyevent', async () => {
    const commands: string[] = [];
    const adapter = new AdbAdapter(
      fakeAdbSpawn((cmd) => {
        commands.push(cmd);
        return ['', 0];
      }),
    );
    await adapter.sendCommand('owo hunt');
    expect(commands).toEqual([
      "input text 'owo'",
      'input keyevent 62',
      "input text 'hunt'",
      'input keyevent 66',
    ]);
  });
});
