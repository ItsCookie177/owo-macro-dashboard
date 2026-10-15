import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultConfig } from './config.js';
import { PresetStore } from './presets.js';

const files: string[] = [];

function tempPresetPath(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'owo-preset-'));
  const file = path.join(dir, 'presets.json');
  files.push(file);
  return file;
}

function publicConfig() {
  const { lanToken: _ignored, ...cfg } = defaultConfig();
  return cfg;
}

afterEach(() => {
  for (const f of files.splice(0)) {
    rmSync(path.dirname(f), { recursive: true, force: true });
  }
});

describe('PresetStore', () => {
  it('simpan → baca ulang dari disk → hapus', () => {
    const file = tempPresetPath();
    const store = new PresetStore(file);
    const preset = store.save('harian', publicConfig());
    expect(preset.name).toBe('harian');
    expect(preset.config.rotation).toHaveLength(4);

    const reloaded = new PresetStore(file);
    expect(reloaded.list()).toHaveLength(1);
    expect(reloaded.list()[0].config.minDelaySec).toBe(22);

    expect(reloaded.remove('harian')).toBe(true);
    expect(reloaded.remove('harian')).toBe(false);
    expect(new PresetStore(file).list()).toHaveLength(0);
  });

  it('nama sama → overwrite, tetap satu entri', () => {
    const file = tempPresetPath();
    const store = new PresetStore(file);
    store.save('a', publicConfig());
    store.save('a', { ...publicConfig(), minDelaySec: 30 });
    const list = store.list();
    expect(list).toHaveLength(1);
    expect(list[0].config.minDelaySec).toBe(30);
  });

  it('nama kosong dan config tidak valid ditolak', () => {
    const file = tempPresetPath();
    const store = new PresetStore(file);
    expect(() => store.save('   ', publicConfig())).toThrow();
    expect(() =>
      store.save('x', { ...publicConfig(), minDelaySec: 1 }),
    ).toThrow();
    expect(store.list()).toHaveLength(0);
    expect(existsSync(file)).toBe(false);
  });

  it('preset tidak valid di disk dilewati (file tetap dipakai)', () => {
    const file = tempPresetPath();
    const store = new PresetStore(file);
    store.save('ok', publicConfig());
    // Suntik entri rusak manual
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    raw.presets.push({ name: 'rusak', savedAt: 'x', config: null });
    writeFileSync(file, JSON.stringify(raw));
    const reloaded = new PresetStore(file);
    expect(reloaded.list().map((p) => p.name)).toEqual(['ok']);
  });
});
