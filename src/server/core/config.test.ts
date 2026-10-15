import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigStore, defaultConfig } from './config.js';

function tempConfigPath(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'owo-cfg-'));
  return path.join(dir, 'config.json');
}

describe('ConfigStore', () => {
  it('membuat config default + token saat file belum ada', () => {
    const filePath = tempConfigPath();
    const store = new ConfigStore(filePath);
    expect(store.get().minDelaySec).toBe(22);
    expect(store.get().maxDelaySec).toBe(48);
    expect(store.get().rotation).toHaveLength(4);
    expect(store.get().lanToken.length).toBeGreaterThanOrEqual(8);
    // Default cmd uang: tanpa nominal & tanpa limit — user isi sendiri.
    const cf = store.get().rotation.find((c) => c.id === 'cf');
    expect(cf).toMatchObject({
      text: 'owo coinflip head',
      amount: null,
      maxPerSession: null,
    });
    const slots = store.get().rotation.find((c) => c.id === 'slots');
    expect(slots).toMatchObject({ amount: null, maxPerSession: null });
    const onDisk = JSON.parse(readFileSync(filePath, 'utf8'));
    expect(onDisk.minDelaySec).toBe(22);
  });

  it('config lama (intervalSec/jitterSec) di-migrasi dengan default field baru', () => {
    const filePath = tempConfigPath();
    writeFileSync(
      filePath,
      JSON.stringify({
        intervalSec: 30,
        jitterSec: 2,
        rotation: [
          { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: null },
        ],
        selectors: { composerId: '' },
        lanToken: 'lamacantoken123',
      }),
      'utf8',
    );
    const store = new ConfigStore(filePath);
    expect(store.get().minDelaySec).toBe(22);
    expect(store.get().lanToken).toBe('lamacantoken123');
  });

  it('update menyimpan ke disk dan mempertahankan token', () => {
    const filePath = tempConfigPath();
    const store = new ConfigStore(filePath);
    const token = store.get().lanToken;
    store.update({
      ...defaultConfig(),
      minDelaySec: 30,
      maxDelaySec: 60,
    });
    expect(store.get().minDelaySec).toBe(30);
    expect(store.get().maxDelaySec).toBe(60);
    expect(store.get().lanToken).toBe(token);
    const onDisk = JSON.parse(readFileSync(filePath, 'utf8'));
    expect(onDisk.minDelaySec).toBe(30);
    expect(onDisk.lanToken).toBe(token);
  });

  it('load ulang membaca nilai yang sama', () => {
    const filePath = tempConfigPath();
    const store = new ConfigStore(filePath);
    store.update({ ...defaultConfig(), maxSessionMin: 25 });
    const store2 = new ConfigStore(filePath);
    expect(store2.get().maxSessionMin).toBe(25);
    expect(store2.get().lanToken).toBe(store.get().lanToken);
  });

  it('file rusak -> fallback default dengan token baru', () => {
    const filePath = tempConfigPath();
    writeFileSync(filePath, '{ not json', 'utf8');
    const store = new ConfigStore(filePath);
    expect(store.get().minDelaySec).toBe(22);
    expect(store.get().lanToken.length).toBeGreaterThanOrEqual(8);
  });

  it('file tidak valid menurut skema -> fallback default', () => {
    const filePath = tempConfigPath();
    writeFileSync(filePath, JSON.stringify({ minDelaySec: 1 }), 'utf8');
    const store = new ConfigStore(filePath);
    expect(store.get().minDelaySec).toBe(22);
  });
});
