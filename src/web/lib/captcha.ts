import { CAPTCHA_WINDOW_MS } from '../../shared/types';

/** Sisa waktu jendela verifikasi 10 menit (ms), nol kalau sudah lewat. */
export function captchaRemainingMs(captchaAt: string, now: number): number {
  return Math.max(0, Date.parse(captchaAt) + CAPTCHA_WINDOW_MS - now);
}

/** Format ms → "09:42" (menit:detik). */
export function formatMMSS(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
