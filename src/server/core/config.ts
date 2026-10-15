import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { configSchema } from '../../shared/schema.js';
import type { ConfigInput } from '../../shared/schema.js';
import type { AppConfig } from '../../shared/types.js';

export function defaultConfig(): AppConfig {
  return {
    minDelaySec: 22,
    maxDelaySec: 48,
    maxSessionMin: 10,
    breakEveryCmd: 12,
    breakMinSec: 60,
    breakMaxSec: 120,
    startGraceSec: 10,
    autoStopOnForegroundLoss: true,
    shuffleOrder: false,
    rotation: [
      { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: null, amount: null },
      {
        id: 'battle',
        text: 'owo battle',
        enabled: true,
        maxPerSession: null,
        amount: null,
      },
      {
        id: 'cf',
        text: 'owo coinflip head',
        enabled: true,
        maxPerSession: 10,
        amount: 100,
      },
      {
        id: 'slots',
        text: 'owo slots',
        enabled: true,
        maxPerSession: 10,
        amount: null,
      },
    ],
    selectors: { composerId: '' },
    lanToken: '',
  };
}

export class ConfigStore {
  private config: AppConfig;

  constructor(
    private readonly filePath: string = path.join(process.cwd(), 'config.json'),
  ) {
    this.config = this.load();
  }

  get(): AppConfig {
    return this.config;
  }

  update(input: ConfigInput): AppConfig {
    const parsed = configSchema.parse(input);
    this.config = { ...parsed, lanToken: this.ensureToken(this.config.lanToken) };
    this.save();
    return this.config;
  }

  private ensureToken(current: string): string {
    return current.length >= 8 ? current : randomBytes(8).toString('hex');
  }

  private load(): AppConfig {
    const fallback = defaultConfig();
    if (!existsSync(this.filePath)) {
      const config = { ...fallback, lanToken: randomBytes(8).toString('hex') };
      this.filePath && this.saveTo(this.filePath, config);
      return config;
    }
    try {
      const raw = JSON.parse(readFileSync(this.filePath, 'utf8'));
      const persisted = configSchema.safeParse(raw);
      if (!persisted.success) {
        console.warn(
          '[config] config.json tidak valid, pakai default:',
          persisted.error.issues[0]?.message,
        );
        const config = { ...fallback, lanToken: randomBytes(8).toString('hex') };
        this.saveTo(this.filePath, config);
        return config;
      }
      const rawToken =
        typeof raw.lanToken === 'string' ? raw.lanToken : '';
      return { ...persisted.data, lanToken: this.ensureToken(rawToken) };
    } catch {
      console.warn('[config] config.json gagal dibaca, pakai default');
      const config = { ...fallback, lanToken: randomBytes(8).toString('hex') };
      this.saveTo(this.filePath, config);
      return config;
    }
  }

  private save(): void {
    this.saveTo(this.filePath, this.config);
  }

  private saveTo(filePath: string, config: AppConfig): void {
    mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = filePath + '.tmp';
    writeFileSync(tmp, JSON.stringify(config, null, 2) + '\n', 'utf8');
    renameSync(tmp, filePath);
  }
}
