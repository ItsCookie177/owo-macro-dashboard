/**
 * Deteksi command berbau uang/cowoncy (OwO Wiki — kategori Gambling/Economy).
 * Gambling terima nominal: slots, coinflip, lottery, blackjack.
 */
const MONEY_WORDS = new Set([
  'slots',
  'slot',
  's',
  'cf',
  'coinflip',
  'coin',
  'flip',
  'lottery',
  'lotto',
  'bet',
  'blackjack',
  'bj',
  '21',
]);

const PREFIX = new Set(['owo', 'w', '!owo', '/']);

/** true kalau teks command mengandung kata kunci judi/uang → tampilkan input jumlah koin. */
export function isMoneyCommand(text: string): boolean {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.some((word) => !PREFIX.has(word) && MONEY_WORDS.has(word));
}

/** Saran tambah cepat: gambling (nominal) + economy (penghasil koin). */
export const MONEY_SUGGESTIONS: { text: string; money: boolean }[] = [
  { text: 'owo slots', money: true },
  { text: 'owo coinflip head', money: true },
  { text: 'owo lottery', money: true },
  { text: 'owo blackjack', money: true },
  { text: 'owo daily', money: false },
  { text: 'owo quest', money: false },
  { text: 'owo sell all', money: false },
  { text: 'owo cowoncy', money: false },
];
