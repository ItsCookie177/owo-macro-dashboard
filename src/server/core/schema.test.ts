import { describe, expect, it } from 'vitest';
import { configSchema, startSchema, stopSchema } from '../../shared/schema.js';
import { defaultConfig } from '../core/config.js';

describe('startSchema', () => {
  it('override delay diterima', () => {
    expect(startSchema.parse({ minDelaySec: 5 }).minDelaySec).toBe(5);
    expect(startSchema.parse({ maxDelaySec: 600 }).maxDelaySec).toBe(600);
    expect(startSchema.parse({}).minDelaySec).toBeUndefined();
  });

  it('delay di luar batas ditolak', () => {
    expect(startSchema.safeParse({ minDelaySec: 4 }).success).toBe(false);
    expect(startSchema.safeParse({ maxDelaySec: 601 }).success).toBe(false);
    expect(startSchema.safeParse({ minDelaySec: 12.5 }).success).toBe(false);
    expect(startSchema.safeParse({ minDelaySec: '30' }).success).toBe(false);
    expect(startSchema.safeParse({ minDelaySec: NaN }).success).toBe(false);
  });

  it('max < min ditolak saat keduanya diisi', () => {
    expect(
      startSchema.safeParse({ minDelaySec: 30, maxDelaySec: 20 }).success,
    ).toBe(false);
    expect(
      startSchema.safeParse({ minDelaySec: 30 }).success,
    ).toBe(true);
  });
});

describe('configSchema', () => {
  it('default config valid', () => {
    const { lanToken: _t, ...input } = defaultConfig();
    expect(configSchema.safeParse(input).success).toBe(true);
  });

  it('field baru terisi default saat lama config (tanpa field baru)', () => {
    const parsed = configSchema.parse({
      intervalSec: 30,
      jitterSec: 2,
      rotation: [
        { id: 'hunt', text: 'owo hunt', enabled: true, maxPerSession: null },
      ],
      selectors: { composerId: '' },
    });
    expect(parsed.minDelaySec).toBe(22);
    expect(parsed.maxDelaySec).toBe(48);
    expect(parsed.breakEveryCmd).toBe(12);
    expect(parsed.startGraceSec).toBe(10);
  });

  it('maxDelaySec < minDelaySec ditolak', () => {
    const { lanToken: _t, ...input } = defaultConfig();
    expect(
      configSchema.safeParse({ ...input, minDelaySec: 40, maxDelaySec: 30 })
        .success,
    ).toBe(false);
  });

  it('rotation wajib minimal 1', () => {
    const base = defaultConfig();
    const { lanToken: _t, ...input } = base;
    expect(
      configSchema.safeParse({ ...input, rotation: [] }).success,
    ).toBe(false);
  });

  it('maxPerSession harus positif atau null', () => {
    const base = defaultConfig();
    const { lanToken: _t, ...input } = base;
    const bad = {
      ...input,
      rotation: [
        { id: 'x', text: 'owo', enabled: true, maxPerSession: 0 },
      ],
    };
    expect(configSchema.safeParse(bad).success).toBe(false);
  });
});

describe('stopSchema', () => {
  it('default normal', () => {
    expect(stopSchema.parse({}).mode).toBe('normal');
    expect(stopSchema.parse({ mode: 'emergency' }).mode).toBe('emergency');
    expect(stopSchema.safeParse({ mode: 'asap' }).success).toBe(false);
  });
});
