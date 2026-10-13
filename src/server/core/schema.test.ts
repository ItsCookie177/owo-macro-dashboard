import { describe, expect, it } from 'vitest';
import { configSchema, startSchema, stopSchema } from '../../shared/schema.js';
import { defaultConfig } from '../core/config.js';

describe('startSchema', () => {
  it('interval 5-600 diterima', () => {
    expect(startSchema.parse({ intervalSec: 5 }).intervalSec).toBe(5);
    expect(startSchema.parse({ intervalSec: 600 }).intervalSec).toBe(600);
    expect(startSchema.parse({}).intervalSec).toBeUndefined();
  });

  it('interval di luar batas ditolak', () => {
    expect(startSchema.safeParse({ intervalSec: 4 }).success).toBe(false);
    expect(startSchema.safeParse({ intervalSec: 601 }).success).toBe(false);
    expect(startSchema.safeParse({ intervalSec: 12.5 }).success).toBe(false);
    expect(startSchema.safeParse({ intervalSec: '30' }).success).toBe(false);
    expect(startSchema.safeParse({ intervalSec: NaN }).success).toBe(false);
  });
});

describe('configSchema', () => {
  it('default config valid', () => {
    const { lanToken: _t, ...input } = defaultConfig();
    expect(configSchema.safeParse(input).success).toBe(true);
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
