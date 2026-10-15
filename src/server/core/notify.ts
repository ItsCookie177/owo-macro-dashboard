import { execFile } from 'node:child_process';

/**
 * Notifikasi keras ke HP via Termux (notification + getar) — best effort.
 * Binary tidak ada / bukan Termux → diam. Dalam test sengaja dimatikan.
 */
export function bestEffortNotify(title: string, body: string): void {
  if (process.env.VITEST) return;
  try {
    execFile(
      'termux-notification',
      [
        '--title',
        title,
        '--content',
        body,
        '--priority',
        'high',
        '--vibrate',
        '400',
      ],
      () => {
        /* best effort */
      },
    );
  } catch {
    /* bukan Termux / binary tidak ada */
  }
}
