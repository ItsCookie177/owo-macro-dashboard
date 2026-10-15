import { describe, expect, it } from 'vitest';
import { isMoneyCommand, MONEY_SUGGESTIONS } from './money.js';

describe('isMoneyCommand', () => {
  it('kenali command gambling (terima nominal koin)', () => {
    for (const text of [
      'owo slots',
      'owo s 100',
      'owo cf',
      'owo coinflip head',
      'owo lottery',
      'owo lotto buy',
      'owo blackjack',
      'w bj',
      'owo bet',
    ]) {
      expect(isMoneyCommand(text), text).toBe(true);
    }
  });

  it('bukan command uang', () => {
    for (const text of [
      'owo hunt',
      'owo battle',
      'owo search',
      'owo daily',
      'owo quest',
      'owo sell all',
      'owo zoo',
      'owo sacrifice',
    ]) {
      expect(isMoneyCommand(text), text).toBe(false);
    }
  });

  it('prefix owo/w tidak dihitung sebagai kata uang', () => {
    expect(isMoneyCommand('owo flip')).toBe(true); // flip = alias coinflip
    expect(isMoneyCommand('w h')).toBe(false);
    expect(isMoneyCommand('')).toBe(false);
  });

  it('daftar saran mengandung gambling dan economy', () => {
    const texts = MONEY_SUGGESTIONS.map((s) => s.text);
    expect(texts.some((t) => isMoneyCommand(t))).toBe(true);
    expect(MONEY_SUGGESTIONS.some((s) => s.money)).toBe(true);
  });
});
