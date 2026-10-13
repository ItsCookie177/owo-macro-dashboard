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
    lastError: null,
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
      lastError: null,
    };
    this.emit('update');
  }

  markNext(id: string | null): void {
    this.stats.nextCommandId = id;
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

  end(status: Status = 'idle'): void {
    this.stats.status = status;
    this.stats.nextCommandId = null;
    this.stats.lastSentAt = null;
    this.emit('update');
  }

  snapshot(): Stats {
    return { ...this.stats, perCommand: { ...this.stats.perCommand } };
  }
}
