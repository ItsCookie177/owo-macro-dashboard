import { AdbAdapter } from './adb.js';
import { MockAdapter } from './mock.js';
import { ShizukuAdapter } from './shizuku.js';
import type { AutomationAdapter } from './types.js';

let adapter: AutomationAdapter | null = null;

/**
 * Deteksi adapter: Shizuku (rish) dulu, lalu ADB wireless, terakhir Mock.
 * Adapter yang terpilih dipertahankan (rish menyimpan sesi persistent).
 */
export async function detectAdapter(): Promise<AutomationAdapter> {
  const shizuku = new ShizukuAdapter();
  try {
    if (await shizuku.isAvailable()) {
      console.log('[detect] adapter: shizuku');
      return shizuku;
    }
  } catch {
    /* lanjut */
  }
  await shizuku.dispose().catch(() => {});

  const adb = new AdbAdapter();
  try {
    if (await adb.isAvailable()) {
      console.log('[detect] adapter: adb');
      return adb;
    }
  } catch {
    /* lanjut */
  }

  console.warn('[detect] tidak ada adapter device — fallback mock');
  return new MockAdapter();
}

export function getAdapter(): AutomationAdapter {
  if (!adapter) {
    // deteksi dijalankan saat boot; fallback aman kalau belum
    adapter = new MockAdapter();
  }
  return adapter;
}

export function setAdapter(a: AutomationAdapter): void {
  adapter = a;
}
