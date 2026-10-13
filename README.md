# OwO Hunt Macro Dashboard

Dashboard web untuk menjalankan command OwO Bot (`owo hunt`, `owo battle`,
`owo coinflip`, `owo slots`) otomatis di Discord Android lewat **UI automation**
(ADB / Shizuku) — tanpa token Discord, tanpa self-bot API. Server jalan di
Termux, diakses dari HP atau PC di Wi-Fi yang sama.

## Fitur

- Rotasi command otomatis dengan interval custom (default 30 dtk) + jitter
- Batas per command type (mis. coinflip/slots max 20× per sesi)
- Sesi foreground singkat, auto-stop: fokus pindah dari Discord (anti salah
  ketik), gagal 3× berturut, atau lewat batas waktu
- Adapter auto-detect: Shizuku → ADB → mock (untuk demo/test)
- Dashboard real-time: statistik, countdown, log stream (SSE), probe diagnostik
- Akses LAN pakai token (localhost gratis, device lain wajib token)

## Prasyarat

- **Termux** dari [F-Droid/GitHub](https://f-droid.org/packages/com.termux/)
  (bukan Play Store)
- **Node.js** 20+: `pkg install nodejs`
- HP Android dengan **Discord** terpasang + saluran yang ada **OwO Bot**
- **Wireless debugging** (ADB) — untuk mengendalikan device dari dirinya sendiri

## Instalasi

```sh
pkg update && pkg install -y nodejs
unzip projek-makro-owo.zip -d ~/
cd ~/makro
npm install
node scripts/fix-termux-bins.mjs   # perbaiki wrapper npm khusus Termux
```

## Pasang ADB (sekali saja)

1. HP: **Settings → Developer options → Wireless debugging** → aktifkan
2. Tap **"Pair device with pairing code"** — catat **kode 6 digit** + **port**
   (pakai split-screen supaya jendela pairing tidak keburu tertutup)
3. Jalankan (di folder proyek):

   ```sh
   ./scripts/setup-adb-pair.sh <pair-port> <kode-6-digit>
   # contoh: ./scripts/setup-adb-pair.sh 37000 123456
   ```

4. Connect memakai port **"IP address & Port"** yang tampil di layar:

   ```sh
   adb connect 127.0.0.1:<connect-port>
   ```

5. Saat diminta di layar HP, izinkan **"Allow USB debugging"**
6. Verifikasi: `./scripts/check-device.sh`

> Setelah reboot, wireless debugging mati — ulangi langkah 4. Kalau pernah
> jalan sekali sambung dengan `adb tcpip 5555`, cukup `adb connect 127.0.0.1:5555`.

## Jalankan

```sh
npm start
```

Log akan menampilkan URL dashboard + token, contoh:

```
[server] akses PC: http://192.168.0.105:3000/?token=xxxxxxxxxxxxxxxx
```

Buka URL itu di browser PC (satu Wi-Fi) atau HP. `config.json` dibuat otomatis
dengan token random saat pertama jalan — bisa juga diubah lewat UI.

## Cara pakai

1. Buka **Discord di saluran bersama OwO Bot** — fullscreen, split-screen, atau
   browser floating window di atas Discord semuanya didukung
2. Di dashboard: atur **interval** (min 5 dtk; `owo hunt` cooldown ~15 dtk),
   **rotasi command**, dan batas per command
3. Tekan **Start** → **pindah fokus ke Discord dalam 10 detik** (grace period)
4. Sesi berjalan otomatis sampai:
   - fokus berpindah dari Discord → **auto-stop** (supaya teks tidak nyasar ke
     aplikasi lain — ini by design)
   - gagal kirim 3× berturut-turut
   - lewat batas sesi (`maxSessionMin`, default 10 menit)
5. **Stop** manual kapan saja; Start lagi untuk sesi baru

## Akses dari PC

Server listen `0.0.0.0`. Pastikan PC dan HP di **Wi-Fi yang sama**, lalu buka
URL dari log. Device selain `localhost` wajib menyertakan token.

## Debug & diagnostik

```sh
./scripts/check-device.sh   # status adb, foreground app, Discord terdeteksi
npm run typecheck           # typecheck
npm test                    # unit test
```

Di dashboard ada tombol **Probe**: cek adapter, apakah Discord terlihat/focus,
dan deteksi input composer (`uiautomator dump`).

## Troubleshooting

| Masalah | Solusi |
| --- | --- |
| Start ditolak "Discord tidak terlihat" | Buka Discord di saluran OwO dulu |
| Sesi langsung auto-stop | Focus pindah ke aplikasi lain — biarkan focus di Discord |
| `adb connect refused` | Wireless debugging mati / belum di-pair — ulangi langkah Pasang ADB |
| Muncul device `emulator-5554` | Aman — adapter otomatis memilih serial device asli |
| `uiautomator dump` gagal | Pastikan layar tidak sedang layar kunci/animasi berat |
| Port/route lain | `npm run dev` untuk mode dev (Vite + hot reload) |

## Struktur proyek

```
src/web/        UI React (dashboard, SSE, kontrol)
src/server/     Express API, scheduler, adapter (adb/shizuku/mock)
src/shared/     tipe + skema Zod dipakai dua sisi
scripts/        fix-termux-bins, setup-adb-pair, check-device
```

## Catatan

- Dashboard **mengontrol UI Discord Anda di device ini** — pastikan command
  dikirim ke saluran yang benar sebelum Start.
- Gunakan dengan bijak pada akun Anda sendiri.
