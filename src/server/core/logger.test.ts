import { describe, expect, it } from 'vitest';
import { Logger } from './logger.js';

describe('Logger', () => {
  it('menyimpan entri dengan timestamp dan level', () => {
    const logger = new Logger();
    const entry = logger.info('halo');
    expect(entry.level).toBe('info');
    expect(entry.msg).toBe('halo');
    expect(Number.isNaN(Date.parse(entry.ts))).toBe(false);
    expect(logger.recent()).toHaveLength(1);
  });

  it('emit event log', () => {
    const logger = new Logger();
    const seen: string[] = [];
    logger.on('log', (e) => seen.push(e.msg));
    logger.warn('a');
    logger.error('b');
    expect(seen).toEqual(['a', 'b']);
  });

  it('ring buffer membatasi 500 entri', () => {
    const logger = new Logger();
    for (let i = 0; i < 520; i++) logger.info(`m${i}`);
    const recent = logger.recent();
    expect(recent).toHaveLength(500);
    expect(recent[0].msg).toBe('m20');
    expect(recent[499].msg).toBe('m519');
  });

  it('recent() mengembalikan salinan', () => {
    const logger = new Logger();
    logger.info('x');
    const copy = logger.recent();
    copy.pop();
    expect(logger.recent()).toHaveLength(1);
  });
});
