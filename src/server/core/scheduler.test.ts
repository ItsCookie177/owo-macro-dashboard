import { describe, expect, it } from 'vitest';
import { MockAdapter } from '../adapters/mock.js';
import type { AppConfig } from '../../shared/types.js';
import { ConfigStore } from './config.js';
import { Logger } from './logger.js';
import { computeDelayMs, Scheduler, sleep } from './scheduler.js';
import { Session } from './session.js';

function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    intervalSec: 30,
    maxSessionMin: 10,
    jitterSec: 0,
    autoStopOnForegroundLoss: true,
    rotation: [
      { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: null },
      { id: 'battle', text: 'owo battle', enabled: true, maxPerSession: null },
    ],
    selectors: { composerId: '' },
    lanToken: 'testtoken',
    ...overrides,
  };
}

function makeScheduler(config: AppConfig, adapter: MockAdapter) {
  const session = new Session();
  const logger = new Logger();
  const configStore = {
    get: () => config,
  } as unknown as ConfigStore;
  const scheduler = new Scheduler({
    adapter,
    configStore,
    session,
    logger,
    sleepFn: async () => {},
    firstDelayMs: 0,
  });
  return { scheduler, session, logger };
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
  it('tanpa jitter = interval persis', () => {
    expect(computeDelayMs(30, 0, () => 0.5)).toBe(30_000);
  });

  it('jitter penuh minus', () => {
    expect(computeDelayMs(30, 2, () => 0)).toBe(28_000);
  });

  it('jitter penuh plus', () => {
    expect(computeDelayMs(30, 2, () => 1)).toBe(32_000);
  });

  it('clamp minimal 1ms', () => {
    expect(computeDelayMs(0, 2, () => 0)).toBe(1);
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
        { id: 'battle', text: 'owo battle', enabled: false, maxPerSession: null },
      ],
    });
    const { scheduler, session } = makeScheduler(config, adapter);
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    expect(adapter.sent).toEqual(['owo hunt', 'owo hunt']);
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
    // set foreground false setelah preflight: patch via wrapper
    const origCheck = adapter.checkForeground.bind(adapter);
    adapter.checkForeground = async () => {
      calls += 1;
      if (calls > 1) return false;
      return origCheck();
    };
    await scheduler.start();
    await waitFor(() => session.status === 'idle');
    // satu command terkirim, lalu watchdog stop saat focus hilang
    expect(adapter.sent).toEqual(['owo hunt']);
    expect(
      logger.recent().some((l) => l.level === 'warn' && /foreground/.test(l.msg)),
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
    expect(
      logger.recent().some((l) => l.msg === 'emergency stop'),
    ).toBe(true);
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
    expect(adapter.sent).toEqual(['owo hunt']);
    expect(
      logger.recent().some((l) => /session cap/.test(l.msg)),
    ).toBe(true);
  });

  it('stop saat idle = no-op', async () => {
    const adapter = new MockAdapter();
    const { scheduler } = makeScheduler(testConfig(), adapter);
    await scheduler.stop('normal');
    expect(adapter.cleared).toBe(0);
  });
});
