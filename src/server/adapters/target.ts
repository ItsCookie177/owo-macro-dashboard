export const DISCORD_PKG = 'com.discord';

/**
 * Cek apakah Discord foreground dari output `dumpsys window`.
 * Contoh baris: mCurrentFocus=Window{abc123 u0 com.discord/com.discord.main.MainActivity}
 */
export function isDiscordForeground(dumpsysOutput: string): boolean {
  const focus = dumpsysOutput.match(
    /mCurrentFocus=Window\{[^}]*?\s([\w.]+)\/[^\s}]+\}/,
  );
  if (focus) return focus[1] === DISCORD_PKG;
  // fallback longgar kalau format berubah
  return new RegExp(`\\b${DISCORD_PKG.replace(/\./g, '\\.')}\\b`).test(
    dumpsysOutput,
  );
}

/**
 * Cek apakah Discord terlihat (termasuk split-screen) dari output
 * `dumpsys window windows`. Focused boleh di pane lain, yang penting
 * jendela Discord ada di layar (isOnScreen=true).
 */
export function isDiscordVisible(dumpsysWindowsOutput: string): boolean {
  const blocks = dumpsysWindowsOutput.split(/(?=Window #\d+)/);
  for (const block of blocks) {
    if (!/com\.discord\//.test(block)) continue;
    if (/isOnScreen=true/.test(block)) return true;
  }
  return false;
}

const COMPOSER_HINTS = ['message_input', 'composer', 'message_composer', 'input'];

/**
 * Cari resource-id composer (kotak pesan) dari XML uiautomator.
 * Heuristik: node dengan resource-id com.discord:id/* yang mengandung
 * hint umum composer dan bersifat EditText / focusable.
 */
export function parseComposerId(uixml: string): string | null {
  const nodes = uixml.match(/<node\b[^>]*>/g) ?? [];
  for (const node of nodes) {
    const id = node.match(/resource-id="([^"]+)"/)?.[1] ?? '';
    if (!id.startsWith('com.discord:id/')) continue;
    const lower = id.toLowerCase();
    if (!COMPOSER_HINTS.some((h) => lower.includes(h))) continue;
    const className = node.match(/class="([^"]+)"/)?.[1] ?? '';
    const focusable = /focusable="true"/.test(node);
    const editable =
      className.includes('EditText') || className.includes('RichEditText');
    if (editable || focusable) return id;
  }
  // fallback: node EditText focusable pertama di com.discord
  for (const node of nodes) {
    const id = node.match(/resource-id="([^"]+)"/)?.[1] ?? '';
    if (!id.startsWith('com.discord:id/')) continue;
    const className = node.match(/class="([^"]+)"/)?.[1] ?? '';
    if (className.includes('EditText') && /focusable="true"/.test(node)) {
      return id;
    }
  }
  return null;
}
