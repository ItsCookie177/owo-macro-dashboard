import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { configSchema } from '../../shared/schema.js';
import type { AppConfig } from '../../shared/types.js';

export type PresetConfig = Omit<AppConfig, 'lanToken'>;

export type Preset = {
  name: string;
  savedAt: string;
  config: PresetConfig;
};

type FileShape = { presets: Preset[] };

/** Preset rotasi/config disimpan di presets.json (di samping config.json). */
export class PresetStore {
  private presets: Preset[] = [];

  constructor(
    private readonly filePath: string = path.join(process.cwd(), 'presets.json'),
  ) {
    this.presets = this.load();
  }

  list(): Preset[] {
    return [...this.presets].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  save(name: string, config: PresetConfig): Preset {
    const clean = name.trim().slice(0, 40);
    if (!clean) throw new Error('nama preset kosong');
    // Validasi konfigurasi dulu — preset gagal tidak boleh merusak config aktif.
    const parsed = configSchema.parse({ ...config, lanToken: undefined });
    const preset: Preset = {
      name: clean,
      savedAt: new Date().toISOString(),
      config: parsed,
    };
    this.presets = [preset, ...this.presets.filter((p) => p.name !== clean)];
    this.persist();
    return preset;
  }

  remove(name: string): boolean {
    const before = this.presets.length;
    this.presets = this.presets.filter((p) => p.name !== name);
    if (this.presets.length === before) return false;
    this.persist();
    return true;
  }

  private load(): Preset[] {
    if (!existsSync(this.filePath)) return [];
    try {
      const raw = JSON.parse(readFileSync(this.filePath, 'utf8')) as FileShape;
      if (!Array.isArray(raw?.presets)) return [];
      return raw.presets.filter(
        (p): p is Preset =>
          typeof p?.name === 'string' &&
          typeof p?.savedAt === 'string' &&
          configSchema.safeParse(p.config).success,
      );
    } catch {
      console.warn('[presets] presets.json gagal dibaca, mulai kosong');
      return [];
    }
  }

  private persist(): void {
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = this.filePath + '.tmp';
    writeFileSync(
      tmp,
      JSON.stringify({ presets: this.presets }, null, 2) + '\n',
      'utf8',
    );
    renameSync(tmp, this.filePath);
  }
}
