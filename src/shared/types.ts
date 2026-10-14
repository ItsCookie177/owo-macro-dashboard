export type Status = 'idle' | 'running' | 'error';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
}

export interface CommandDef {
  id: string;
  text: string;
  enabled: boolean;
  maxPerSession: number | null;
}

export interface Stats {
  status: Status;
  startedAt: string | null;
  lastSentAt: string | null;
  totalSent: number;
  perCommand: Record<string, number>;
  nextCommandId: string | null;
  /** Target waktu kirim berikutnya (ISO, clock server) — untuk countdown akurat. */
  nextAt: string | null;
  lastError: string | null;
}

export type PublicConfig = Omit<AppConfig, 'lanToken'>;

export interface StateResponse {
  status: Status;
  stats: Stats;
  config: PublicConfig;
  adapter: string;
}

export interface AppConfig {
  minDelaySec: number;
  maxDelaySec: number;
  maxSessionMin: number;
  breakEveryCmd: number;
  breakMinSec: number;
  breakMaxSec: number;
  startGraceSec: number;
  autoStopOnForegroundLoss: boolean;
  rotation: CommandDef[];
  selectors: { composerId: string };
  lanToken: string;
}

export interface HealthResponse {
  ok: true;
}
