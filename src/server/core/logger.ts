import { EventEmitter } from 'node:events';
import type { LogEntry, LogLevel } from '../../shared/types.js';

const MAX_ENTRIES = 500;

export class Logger extends EventEmitter {
  private entries: LogEntry[] = [];

  log(level: LogLevel, msg: string): LogEntry {
    const entry: LogEntry = { ts: new Date().toISOString(), level, msg };
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) this.entries.shift();
    this.emit('log', entry);
    return entry;
  }

  info(msg: string): LogEntry {
    return this.log('info', msg);
  }

  warn(msg: string): LogEntry {
    return this.log('warn', msg);
  }

  error(msg: string): LogEntry {
    return this.log('error', msg);
  }

  recent(): LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}
