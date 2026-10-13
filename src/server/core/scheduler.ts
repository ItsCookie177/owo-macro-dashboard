import type { AppConfig, CommandDef } from '../../shared/types.js';
import type { AutomationAdapter } from '../adapters/types.js';
import type { ConfigStore } from './config.js';
import type { Logger } from './logger.js';
import type { Session } from './session.js';

export type SchedulerDeps = {
  adapter: AutomationAdapter;
  configStore: ConfigStore;
  session: Session;
  logger: Logger;
  sleepFn?: (ms: number, signal: AbortSignal) => Promise<void>;
  now?: () => number;
  random?: () => number;
  /** Jeda sebelum kirim pertama (waktu pindah fokus ke Discord). */
  firstDelayMs?: number;
};

export function computeDelayMs(
  intervalSec: number,
  jitterSec: number,
  random: () => number,
): number {
  const base = intervalSec * 1000;
  const jitter =
    jitterSec > 0 ? (random() * 2 - 1) * jitterSec * 1000 : 0;
  return Math.max(1, Math.round(base + jitter));
}

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      resolve();
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

type Picked = { cmd: CommandDef; offset: number };

function nextCommand(
  rotation: CommandDef[],
  counts: Record<string, number>,
  fromIdx: number,
): Picked | null {
  const n = rotation.length;
  for (let i = 0; i < n; i++) {
    const cmd = rotation[(fromIdx + i) % n];
    if (!cmd.enabled) continue;
    if (
      cmd.maxPerSession !== null &&
      (counts[cmd.id] ?? 0) >= cmd.maxPerSession
    ) {
      continue;
    }
    return { cmd, offset: i };
  }
  return null;
}

export class Scheduler {
  private abort: AbortController | null = null;
  private loopPromise: Promise<void> | null = null;

  constructor(private readonly deps: SchedulerDeps) {}

  get isRunning(): boolean {
    return this.deps.session.status === 'running';
  }

  async start(intervalOverride?: number): Promise<void> {
    const { adapter, configStore, session, logger } = this.deps;
    if (session.status === 'running') {
      throw new Error('sesi sedang berjalan');
    }
    if (!(await adapter.isAvailable())) {
      throw new Error('adapter UI automation tidak tersedia');
    }
    // Preflight: Discord cukup terlihat (split-screen OK).
    // Cek focus strict dijalankan per tick sebelum tiap kirim.
    const visible = adapter.checkVisible
      ? await adapter.checkVisible()
      : await adapter.checkForeground();
    if (!visible) {
      throw new Error(
        'Discord tidak terlihat — buka Discord di channel OwO dulu lalu Start lagi',
      );
    }

    const stored = configStore.get();
    const intervalSec = intervalOverride ?? stored.intervalSec;
    const config: AppConfig = { ...stored, intervalSec };

    this.abort = new AbortController();
    session.begin(new Date());
    logger.info(
      `session started (interval ${intervalSec}s, adapter ${adapter.name})`,
    );
    this.loopPromise = this.loop(config).catch((err) => {
      logger.error(`scheduler crash: ${err}`);
      session.markError(String(err));
      session.end('error');
    });
  }

  async stop(mode: 'normal' | 'emergency'): Promise<void> {
    const { session, logger, adapter } = this.deps;
    if (!this.abort) return;
    this.abort.abort();
    if (mode === 'emergency') {
      logger.warn('emergency stop');
      try {
        await adapter.clearComposer();
      } catch (e) {
        logger.warn(`clear composer gagal: ${e}`);
      }
    } else {
      logger.info('stopped by user');
    }
    await this.loopPromise?.catch(() => {});
    this.abort = null;
    this.loopPromise = null;
    if (session.status === 'running') session.end('idle');
  }

  private async loop(config: AppConfig): Promise<void> {
    const { adapter, session, logger } = this.deps;
    const signal = this.abort!.signal;
    const sleepFn = this.deps.sleepFn ?? sleep;
    const now = this.deps.now ?? Date.now;
    const random = this.deps.random ?? Math.random;

    const counts: Record<string, number> = {};
    const deadline = now() + config.maxSessionMin * 60_000;
    const firstDelay = this.deps.firstDelayMs ?? 10_000;
    let failures = 0;
    let idx = 0;

    // Grace period: beri waktu user pindah tap ke Discord (split-screen).
    if (firstDelay > 0) {
      logger.info(
        `kirim pertama dalam ${Math.round(firstDelay / 1000)} dtk — pindah fokus ke Discord sekarang`,
      );
      await sleepFn(firstDelay, signal);
      if (signal.aborted) {
        if (session.status === 'running') session.end('idle');
        return;
      }
    }

    while (!signal.aborted) {
      const picked = nextCommand(config.rotation, counts, idx);
      if (!picked) {
        logger.info('tidak ada command tersisa (limit habis/disabled) — sesi selesai');
        break;
      }
      idx = (idx + picked.offset + 1) % config.rotation.length;
      session.markNext(picked.cmd.id);

      if (
        config.autoStopOnForegroundLoss &&
        !(await adapter.checkForeground())
      ) {
        logger.warn('Discord kehilangan foreground — auto-stop');
        break;
      }
      if (now() > deadline) {
        logger.warn(
          `session cap ${config.maxSessionMin} menit tercapai — auto-stop`,
        );
        break;
      }

      try {
        await adapter.sendCommand(picked.cmd.text);
        counts[picked.cmd.id] = (counts[picked.cmd.id] ?? 0) + 1;
        failures = 0;
        session.markSent(picked.cmd.id);
        logger.info(`sent: ${picked.cmd.text}`);
      } catch (e) {
        failures += 1;
        logger.error(`gagal kirim "${picked.cmd.text}" (${failures}/3): ${e}`);
        if (failures >= 3) {
          session.markError(`3x gagal kirim berturut-turut: ${e}`);
          break;
        }
      }

      const upcoming = nextCommand(config.rotation, counts, idx);
      session.markNext(upcoming ? upcoming.cmd.id : null);

      await sleepFn(
        computeDelayMs(config.intervalSec, config.jitterSec, random),
        signal,
      );
    }

    if (session.status === 'running') session.end('idle');
  }
}
