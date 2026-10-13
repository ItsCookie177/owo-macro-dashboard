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
    expect(store.get().intervalSec).toBe(30);
    expect(store.get().rotation).toHaveLength(4);
    expect(store.get().lanToken.length).toBeGreaterThanOrEqual(8);
    // tersimpan ke disk
    const onDisk = JSON.parse(readFileSync(filePath, 'utf8'));
    expect(onDisk.intervalSec).toBe(30);
  });

  it('update menyimpan ke disk dan mempertahankan token', () => {
    const filePath = tempConfigPath();
    const store = new ConfigStore(filePath);
    const token = store.get().lanToken;
    store.update({
      ...defaultConfig(),
      intervalSec: 45,
    });
    expect(store.get().intervalSec).toBe(45);
    expect(store.get().lanToken).toBe(token);
    const onDisk = JSON.parse(readFileSync(filePath, 'utf8'));
    expect(onDisk.intervalSec).toBe(45);
    expect(onDisk.lanToken).toBe(token);
  });

  it('load ulang membaca nilai yang sama', () => {
    const filePath = tempConfigPath();
    const store = new ConfigStore(filePath);
    store.update({ ...defaultConfig(), intervalSec: 120 });
    const store2 = new ConfigStore(filePath);
    expect(store2.get().intervalSec).toBe(120);
    expect(store2.get().lanToken).toBe(store.get().lanToken);
  });

  it('file rusak -> fallback default dengan token baru', () => {
    const filePath = tempConfigPath();
    writeFileSync(filePath, '{ not json', 'utf8');
    const store = new ConfigStore(filePath);
    expect(store.get().intervalSec).toBe(30);
    expect(store.get().lanToken.length).toBeGreaterThanOrEqual(8);
  });

  it('file tidak valid menurut skema -> fallback default', () => {
    const filePath = tempConfigPath();
    writeFileSync(filePath, JSON.stringify({ intervalSec: 1 }), 'utf8');
    const store = new ConfigStore(filePath);
    expect(store.get().intervalSec).toBe(30);
  });
});
