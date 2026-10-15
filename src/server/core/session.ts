import { EventEmitter } from 'node:events';
import type { Stats, Status } from '../../shared/types.js';

function idleStats(): Stats {
  return {
    status: 'idle',
    startedAt: null,
    lastSentAt: null,
    totalSent: 0,
    perCommand: {},
    nextCommandId: null,
    nextAt: null,
    lastError: null,
    captchaAt: null,
  };
}

export class Session extends EventEmitter {
  private stats: Stats = idleStats();

  get status(): Status {
    return this.stats.status;
  }

  begin(now: Date = new Date()): void {
    this.stats = {
      status: 'running',
      startedAt: now.toISOString(),
      lastSentAt: null,
      totalSent: 0,
      perCommand: {},
      nextCommandId: null,
      nextAt: null,
      lastError: null,
      captchaAt: null,
    };
    this.emit('update');
  }

  markNext(id: string | null, nextAtMs?: number): void {
    this.stats.nextCommandId = id;
    if (nextAtMs !== undefined) {
      this.stats.nextAt = new Date(nextAtMs).toISOString();
    }
    this.emit('update');
  }

  markSent(id: string): void {
    this.stats.totalSent += 1;
    this.stats.perCommand[id] = (this.stats.perCommand[id] ?? 0) + 1;
    this.stats.lastSentAt = new Date().toISOString();
    this.emit('update');
  }

  markError(msg: string): void {
    this.stats.status = 'error';
    this.stats.lastError = msg;
    this.emit('update');
  }

  /** Status khusus: verifikasi human terdeteksi — sesi berhenti, jendela 10 menit dimulai. */
  markCaptcha(msg: string): void {
    this.stats.status = 'captcha';
    this.stats.lastError = msg;
    this.stats.captchaAt = new Date().toISOString();
    this.emit('update');
  }

  /** Verifikasi hilang dari layar — kunci dilepas, sesi siap diulang. */
  clearCaptcha(): void {
    if (this.stats.status !== 'captcha') return;
    this.stats.status = 'idle';
    this.stats.lastError = null;
    this.stats.captchaAt = null;
    this.emit('update');
  }

  end(status: Status = 'idle'): void {
    this.stats.status = status;
    this.stats.nextCommandId = null;
    this.stats.nextAt = null;
    this.stats.lastSentAt = null;
    if (status !== 'captcha') this.stats.captchaAt = null;
    this.emit('update');
  }

  snapshot(): Stats {
    return { ...this.stats, perCommand: { ...this.stats.perCommand } };
  }
}
