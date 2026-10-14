import { describe, expect, it } from 'vitest';
import { looksLikeVerification, stripZeroWidth } from './captcha.js';

describe('stripZeroWidth', () => {
  it('membuang char zero-width', () => {
    expect(stripZeroWidth('a\u200Bb\u200Cc\u200Dd\u2060e\uFEFFf')).toBe(
      'abcdef',
    );
  });

  it('membiarkan teks normal', () => {
    expect(stripZeroWidth('owo hunt')).toBe('owo hunt');
  });
});

describe('looksLikeVerification', () => {
  it('deteksi "human verification"', () => {
    expect(
      looksLikeVerification(
        'Hey @user please complete human verification to keep playing!',
      ),
    ).toBe(true);
  });

  it('deteksi link captcha OwO', () => {
    expect(
      looksLikeVerification('verify at owobot.com/captcha now'),
    ).toBe(true);
  });

  it('deteksi meski disisipi zero-width char', () => {
    expect(
      looksLikeVerification('complete hum\u200Ban verif\u200Bication'),
    ).toBe(true);
  });

  it('deteksi "verify yourself"', () => {
    expect(looksLikeVerification('Please verify yourself')).toBe(true);
  });

  it('tidak false-positive teks biasa', () => {
    expect(looksLikeVerification('owo hunt\now battle')).toBe(false);
    expect(looksLikeVerification('selamat verify ya')).toBe(false);
    expect(looksLikeVerification('')).toBe(false);
  });
});
