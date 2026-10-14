const VERIFICATION_PATTERNS = [
  /human\s*verification/i,
  /verify\s*yourself/i,
  /owobot\.com\/captcha/i,
  /complete\s+the\s+verification/i,
  /verification\s+(page|link|button)/i,
];

/**
 * Buang zero-width/invisible char (U+200B dll) — pesan verifikasi OwO
 * sering diselipkan char tak terlihat supaya filter sederhana tidak cocok.
 */
export function stripZeroWidth(text: string): string {
  return text.replace(/[\u200B\u200C\u200D\u2060\uFEFF\u00AD]/g, '');
}

/**
 * Cek apakah teks layar (dari uiautomator dump) memuat pesan verifikasi
 * human OwO. Tag/mention ikut terbaca sebagai teks biasa — tidak menghalangi.
 */
export function looksLikeVerification(screenText: string): boolean {
  const cleaned = stripZeroWidth(screenText);
  return VERIFICATION_PATTERNS.some((re) => re.test(cleaned));
}
