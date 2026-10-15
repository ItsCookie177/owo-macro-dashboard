import { describe, expect, it } from 'vitest';
import { MockAdapter } from '../adapters/mock.js';
import type { AppConfig, CommandDef } from '../../shared/types.js';
import { ConfigStore } from './config.js';
import { Logger } from './logger.js';
import { commandText, computeDelayMs, Scheduler, sleep } from './scheduler.js';
import { Session } from './session.js';

type TestCmd = Omit<CommandDef, 'amount'> & { amount?: number | null };

function testConfig(
  overrides: Omit<Partial<AppConfig>, 'rotation'> & {
    rotation?: TestCmd[];
  } = {},
): AppConfig {
  const { rotation, ...rest } = overrides;
  const base: TestCmd[] = [
    { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: null },
    { id: 'battle', text: 'owo battle', enabled: true, maxPerSession: null },
  ];
  return {
    minDelaySec: 22,
    maxDelaySec: 48,
    maxSessionMin: 10,
    breakEveryCmd: 0,
    breakMinSec: 60,
    breakMaxSec: 120,
    startGraceSec: 10,
    autoStopOnForegroundLoss: true,
    shuffleOrder: false,
    rotation: (rotation ?? base).map((c) => ({ amount: null, ...c })),
    selectors: { composerId: '' },
    lanToken: 'testtoken',
    ...rest,
  };
}

function makeScheduler(
  config: AppConfig,
  adapter: MockAdapter,
  extra: {
    sleepFn?: (ms: number, signal: AbortSignal) => Promise<void>;
    random?: () => number;
    captchaCheckMs?: number;
  } = {},
) {
  const session = new Session();
  const logger = new Logger();
  const configStore = {
    get: () => config,
  } as unknown as ConfigStore;
  const sleeps: number[] = [];
  const scheduler = new Scheduler({
    adapter,
    configStore,
    session,
    logger,
    sleepFn: async (ms, signal) => {
      sleeps.push(ms);
      await extra.sleepFn?.(ms, signal);
    },
    firstDelayMs: 0,
    random: extra.random,
    captchaCheckMs: extra.captchaCheckMs,
  });
  return { scheduler, session, logger, sleeps };
}

async function waitFor(
  cond: () => boolean,
  timeoutMs = 2000,
): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor timeout');
    }
    await sleep(5, new AbortController().signal);
  }
}

describe('computeDelayMs', () => {
  it('random 0 = batas bawah', () => {
    expect(computeDelayMs(22, 48, () => 0)).toBe(22_000);
  });

  it('random 1 = batas atas', () => {
    expect(computeDelayMs(22, 48, () => 1)).toBe(48_000);
  });

  it('random 0.5 = tengah', () => {
    expect(computeDelayMs(22, 48, () => 0.5)).toBe(35_000);
  });

  it('min > max tetap aman (di-swap)', () => {
    expect(computeDelayMs(48, 22, () => 0)).toBe(22_000);
  });
});

describe('sleep', () => {
  it('resolve setelah durasi', async () => {
    const start = Date.now();
    await sleep(20, new AbortController().signal);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });

  it('resolve segera saat abort', async () => {
    const ac = new AbortController();
    const p = sleep(10_000, ac.signal);
    ac.abort();
    const start = Date.now();
    await p;
    expect(Date.now() - start).toBeLessThan(100);
  });
});

describe('commandText', () => {
  const cmd = (over: Partial<CommandDef> = {}): CommandDef => ({
    id: 'x',
    text: 'owo slots',
    enabled: true,
    maxPerSession: null,
    amount: null,
    ...over,
  });

  it('tanpa amount = teks apa adanya', () => {
    expect(commandText(cmd())).toBe('owo slots');
    expect(commandText(cmd({ text: '  owo hunt  ' }))).toBe('owo hunt');
  });

  it('amount di-append sebagai nominal koin', () => {
    expect(commandText(cmd({ text: 'owo slots', amount: 1000 }))).toBe(
      'owo slots 1000',
    );
    expect(
      commandText(cmd({ text: 'owo coinflip head', amount: 100 })),
    ).toBe('owo coinflip head 100');
  });
});

describe('Scheduler', () => {
  it('rotasi berurutan sampai semua limit habis', async () => {
    const adapter = new MockAdapter();
    const config = testConfig({
      rotation: [
        { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: 3 },
        { id: 'cf', text: 'owo cf', enabled: true, maxPerSession: 2 },
      ],
    });
    const { scheduler, session } = makeScheduler(config, adapter);
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    expect(adapter.sent).toEqual([
      'owo hunt',
      'owo cf',
      'owo hunt',
      'owo cf',
      'owo hunt',
    ]);
    expect(session.snapshot().totalSent).toBe(5);
    expect(session.snapshot().perCommand).toEqual({ hunt: 3, cf: 2 });
  });

  it('skip command yang disabled', async () => {
    const adapter = new MockAdapter();
    const config = testConfig({
      rotation: [
        { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: 2 },
        {
          id: 'battle',
          text: 'owo battle',
          enabled: false,
          maxPerSession: null,
        },
      ],
    });
    const { scheduler, session } = makeScheduler(config, adapter);
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    expect(adapter.sent).toEqual(['owo hunt', 'owo hunt']);
  });

  it('delay tiap tick dalam rentang min-max (akurat, tanpa overhead)', async () => {
    const adapter = new MockAdapter();
    const config = testConfig({
      minDelaySec: 20,
      maxDelaySec: 40,
      rotation: [
        { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: 3 },
      ],
    });
    const session = new Session();
    const logger = new Logger();
    let fakeNow = 0;
    const sleeps: number[] = [];
    const scheduler = new Scheduler({
      adapter,
      configStore: { get: () => config } as unknown as ConfigStore,
      session,
      logger,
      sleepFn: async (ms) => {
        sleeps.push(ms);
        fakeNow += ms;
      },
      firstDelayMs: 0,
      now: () => fakeNow,
      random: () => 0.25, // 20 + 0.25*20 = 25s
    });
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    // kirim pertama langsung; sisanya tepat 25s (cek focus/dump tidak menumpuk)
    expect(sleeps).toEqual([25_000, 25_000]);
  });

  it('micro-break terpicu tiap N command', async () => {
    const adapter = new MockAdapter();
    const config = testConfig({
      breakEveryCmd: 2,
      breakMinSec: 60,
      breakMaxSec: 60,
      rotation: [
        { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: 4 },
      ],
    });
    const session = new Session();
    const logger = new Logger();
    let fakeNow = 0;
    const sleeps: number[] = [];
    const scheduler = new Scheduler({
      adapter,
      configStore: { get: () => config } as unknown as ConfigStore,
      session,
      logger,
      sleepFn: async (ms) => {
        sleeps.push(ms);
        fakeNow += ms;
      },
      firstDelayMs: 0,
      now: () => fakeNow,
      random: () => 0, // delay = min (22s) tiap saat
    });
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    // tick2: 22s; tick3: break 60s + 22s = 82s; tick4: 22s; tick5 limit habis
    expect(sleeps).toEqual([22_000, 82_000, 22_000]);
    expect(
      logger.recent().some((l) => /micro-break/.test(l.msg)),
    ).toBe(true);
  });

  it('layar dipertahankan nyala saat sesi dan dipulihkan setelahnya', async () => {
    const adapter = new MockAdapter();
    const config = testConfig({
      rotation: [
        { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: 1 },
      ],
    });
    const { scheduler, session } = makeScheduler(config, adapter);
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    expect(adapter.wakeKept).toBe(1);
    expect(adapter.wakeRestored).toBe(1);
  });

  it('nextAt terisi untuk countdown akurat di dashboard', async () => {
    const adapter = new MockAdapter();
    const config = testConfig({
      minDelaySec: 15,
      maxDelaySec: 20,
      rotation: [
        { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: null },
      ],
    });
    const session = new Session();
    const scheduler = new Scheduler({
      adapter,
      configStore: { get: () => config } as unknown as ConfigStore,
      session,
      logger: new Logger(),
      sleepFn: (_ms, signal) => sleep(5000, signal),
      firstDelayMs: 0,
    });
    await scheduler.start();
    await waitFor(() => session.snapshot().nextAt !== null);
    const nextAt = Date.parse(session.snapshot().nextAt!);
    const delta = nextAt - Date.now();
    expect(delta).toBeGreaterThan(14_000);
    expect(delta).toBeLessThanOrEqual(20_000);
    await scheduler.stop('normal');
    expect(session.snapshot().nextAt).toBeNull();
  });

  it('verifikasi human di layar -> latch captcha + auto-stop', async () => {
    const adapter = new MockAdapter();
    adapter.screenText =
      'Hey @kamu please complete human verification at owobot.com/captcha';
    const config = testConfig();
    const { scheduler, session, logger } = makeScheduler(config, adapter);
    await scheduler.start();
    await waitFor(() => session.status === 'captcha');
    expect(adapter.sent).toEqual([]);
    expect(session.snapshot().lastError).toMatch(/verifikasi human/);
    expect(session.snapshot().captchaAt).not.toBeNull();
    expect(
      logger.recent().some((l) => l.level === 'error' && /VERIFIKASI/.test(l.msg)),
    ).toBe(true);
  });

  it('start ditolak selama verifikasi masih di layar', async () => {
    const adapter = new MockAdapter();
    adapter.screenText = 'please verify at owobot.com/captcha';
    const config = testConfig();
    const { scheduler, session } = makeScheduler(config, adapter);
    await scheduler.start();
    await waitFor(() => session.status === 'captcha');
    await expect(scheduler.start()).rejects.toThrow(/verifikasi human masih/);
    expect(session.status).toBe('captcha');
  });

  it('verifikasi selesai -> watcher buka kunci otomatis', async () => {
    const adapter = new MockAdapter();
    adapter.screenText = 'verify yourself at owobot.com/captcha now';
    const config = testConfig();
    const { scheduler, session } = makeScheduler(config, adapter, {
      captchaCheckMs: 15,
    });
    await scheduler.start();
    await waitFor(() => session.status === 'captcha');
    adapter.screenText = 'owo hunt\now battle';
    await waitFor(() => session.status === 'idle');
    expect(session.snapshot().captchaAt).toBeNull();
    expect(session.snapshot().lastError).toBeNull();
  });

  it('dumpUi gagal bukan alasan stop', async () => {
    const adapter = new MockAdapter();
    adapter.dumpUi = async () => {
      throw new Error('idle state');
    };
    const config = testConfig({
      rotation: [
        { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: 1 },
      ],
    });
    const { scheduler, session } = makeScheduler(config, adapter);
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    expect(adapter.sent).toEqual(['owo hunt']);
  });

  it('start saat sudah running ditolak', async () => {
    const adapter = new MockAdapter();
    const config = testConfig({
      rotation: [
        { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: null },
      ],
    });
    const session = new Session();
    const logger = new Logger();
    const scheduler = new Scheduler({
      adapter,
      configStore: { get: () => config } as unknown as ConfigStore,
      session,
      logger,
      sleepFn: (_ms, signal) => sleep(5000, signal),
      firstDelayMs: 0,
    });
    await scheduler.start();
    await expect(scheduler.start()).rejects.toThrow('sesi sedang berjalan');
    await scheduler.stop('normal');
  });

  it('preflight gagal kalau adapter tidak tersedia', async () => {
    const adapter = new MockAdapter();
    adapter.available = false;
    const { scheduler, session } = makeScheduler(testConfig(), adapter);
    await expect(scheduler.start()).rejects.toThrow(
      'adapter UI automation tidak tersedia',
    );
    expect(session.status).toBe('idle');
  });

  it('preflight gagal kalau Discord tidak terlihat', async () => {
    const adapter = new MockAdapter();
    adapter.foreground = false;
    const { scheduler, session } = makeScheduler(testConfig(), adapter);
    await expect(scheduler.start()).rejects.toThrow(/terlihat/);
    expect(session.status).toBe('idle');
  });

  it('auto-stop saat Discord kehilangan foreground', async () => {
    const adapter = new MockAdapter();
    const config = testConfig();
    const session = new Session();
    const logger = new Logger();
    let calls = 0;
    const scheduler = new Scheduler({
      adapter,
      configStore: { get: () => config } as unknown as ConfigStore,
      session,
      logger,
      sleepFn: async () => {},
      firstDelayMs: 0,
      now: Date.now,
      random: () => 0.5,
    });
    const origCheck = adapter.checkForeground.bind(adapter);
    adapter.checkForeground = async () => {
      calls += 1;
      if (calls > 1) return false;
      return origCheck();
    };
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    expect(adapter.sent).toEqual(['owo hunt']);
    expect(
      logger
        .recent()
        .some((l) => l.level === 'warn' && /foreground/.test(l.msg)),
    ).toBe(true);
  });

  it('3x gagal kirim -> status error', async () => {
    const adapter = new MockAdapter();
    adapter.failAllSends = true;
    const config = testConfig({
      rotation: [
        { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: null },
      ],
    });
    const { scheduler, session } = makeScheduler(config, adapter);
    await scheduler.start();
    await waitFor(() => session.status === 'error');
    expect(session.snapshot().lastError).toMatch(/3x gagal/);
  });

  it('emergency stop memanggil clearComposer dan berhenti', async () => {
    const adapter = new MockAdapter();
    const session = new Session();
    const logger = new Logger();
    const config = testConfig();
    const scheduler = new Scheduler({
      adapter,
      configStore: { get: () => config } as unknown as ConfigStore,
      session,
      logger,
      sleepFn: (_ms, signal) => sleep(5000, signal),
      firstDelayMs: 0,
    });
    await scheduler.start();
    await waitFor(() => adapter.sent.length === 1);
    await scheduler.stop('emergency');
    expect(session.status).toBe('idle');
    expect(adapter.cleared).toBe(1);
    expect(logger.recent().some((l) => l.msg === 'emergency stop')).toBe(true);
  });

  it('session cap memicu auto-stop', async () => {
    const adapter = new MockAdapter();
    const session = new Session();
    const logger = new Logger();
    const config = testConfig({ maxSessionMin: 1 });
    let fakeNow = 0;
    const scheduler = new Scheduler({
      adapter,
      configStore: { get: () => config } as unknown as ConfigStore,
      session,
      logger,
      sleepFn: async () => {
        fakeNow += 120_000; // lompat 2 menit tiap tick -> lewati cap 1 menit
      },
      firstDelayMs: 0,
      now: () => fakeNow,
      random: () => 0.5,
    });
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    expect(adapter.sent).toEqual(['owo hunt', 'owo battle']);
    expect(logger.recent().some((l) => /session cap/.test(l.msg))).toBe(true);
  });

  it('stop saat idle = no-op', async () => {
    const adapter = new MockAdapter();
    const { scheduler } = makeScheduler(testConfig(), adapter);
    await scheduler.stop('normal');
    expect(adapter.cleared).toBe(0);
  });

  it('cmd uang: amount ikut terkirim ke Discord', async () => {
    const adapter = new MockAdapter();
    const config = testConfig({
      rotation: [
        {
          id: 'cf',
          text: 'owo coinflip head',
          enabled: true,
          maxPerSession: 1,
          amount: 100,
        },
        {
          id: 'slots',
          text: 'owo slots',
          enabled: true,
          maxPerSession: 1,
          amount: null,
        },
      ],
    });
    const { scheduler, session } = makeScheduler(config, adapter);
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    expect(adapter.sent).toEqual(['owo coinflip head 100', 'owo slots']);
  });

  it('shuffleOrder: urutan acak deterministik + isi ulang tiap siklus', async () => {
    const adapter = new MockAdapter();
    const config = testConfig({
      shuffleOrder: true,
      rotation: [
        { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: 2 },
        { id: 'battle', text: 'owo battle', enabled: true, maxPerSession: 2 },
        { id: 'cf', text: 'owo cf', enabled: true, maxPerSession: 2 },
      ],
    });
    const { scheduler, session } = makeScheduler(config, adapter, {
      random: () => 0,
    });
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    // Fisher-Yates dgn random=0 → [battle, cf, hunt], diulang tiap siklus
    expect(adapter.sent).toEqual([
      'owo battle',
      'owo cf',
      'owo hunt',
      'owo battle',
      'owo cf',
      'owo hunt',
    ]);
  });

  it('shuffleOrder: skip disabled/limit habis di antrean lalu selesai', async () => {
    const adapter = new MockAdapter();
    const config = testConfig({
      shuffleOrder: true,
      rotation: [
        { id: 'a', text: 'owo a', enabled: true, maxPerSession: 1 },
        { id: 'b', text: 'owo b', enabled: false, maxPerSession: null },
        { id: 'c', text: 'owo c', enabled: true, maxPerSession: 1 },
      ],
    });
    const { scheduler, session } = makeScheduler(config, adapter, {
      random: () => 0,
    });
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    expect(adapter.sent).toEqual(['owo c', 'owo a']);
    expect(session.snapshot().totalSent).toBe(2);
  });

  it('shuffleOrder mati = round-robin urut seperti biasa', async () => {
    const adapter = new MockAdapter();
    const config = testConfig({
      shuffleOrder: false,
      rotation: [
        { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: 1 },
        { id: 'cf', text: 'owo cf', enabled: true, maxPerSession: 1 },
      ],
    });
    const { scheduler, session } = makeScheduler(config, adapter, {
      random: () => 0,
    });
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    expect(adapter.sent).toEqual(['owo hunt', 'owo cf']);
  });
});
