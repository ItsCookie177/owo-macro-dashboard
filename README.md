<div align="center">

# OwO Hunt Macro Dashboard

**Macro command OwO Bot di Discord Android — otomatis, terjadwal, tanpa token.**

Web dashboard + server di Termux yang mengendalikan Discord lewat UI automation
(ADB / Shizuku). Bukan self-bot API — murni simulasi ketik di layar.

[![Node](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vitest](https://img.shields.io/badge/test-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Termux-A4C639?logo=android&logoColor=white)](https://termux.dev)

</div>

---

## Daftar Isi

- [Fitur](#fitur)
- [Cara Kerja](#cara-kerja)
- [Mulai Cepat](#mulai-cepat)
- [Penggunaan](#penggunaan)
- [Konfigurasi](#konfigurasi)
- [Diagnostik](#diagnostik)
- [Troubleshooting](#troubleshooting)
- [Pengembangan](#pengembangan)
- [Struktur Proyek](#struktur-proyek)

---

## Fitur

| | |
| --- | --- |
| ✅ **Rotasi otomatis** | `owo hunt` → `battle` → `coinflip` → `slots`… interval custom + jitter anti-pattern |
| ✅ **Batas per command** | Mis. coinflip/slots dibatasi 20× per sesi — hunt/battle bebas |
| ✅ **Anti salah ketik** | Auto-stop saat focus pindah dari Discord; teks tidak pernah nyasar ke app lain |
| ✅ **Multi mode layar** | Fullscreen, split-screen, atau browser floating window di atas Discord |
| ✅ **Adapter otomatis** | Deteksi Shizuku → fallback ADB → mock (untuk demo tanpa device) |
| ✅ **Dashboard real-time** | Statistik, countdown, log stream (SSE), tombol probe diagnostik |
| ✅ **Akses HP + PC** | Server listen di LAN, proteksi token (localhost gratis) |
| ✅ **Privasi** | Tanpa token Discord, tanpa API eksternal — semua jalan lokal di HP kamu |

---

## Cara Kerja

```
┌─────────────┐   HTTP/SSE    ┌──────────────┐   ADB / Shizuku   ┌─────────┐
│  Browser     │ ◄──────────► │  Termux       │ ────────────────► │ Discord │
│  (HP / PC)   │   dashboard  │  Node server  │   ketik & tap     │  + OwO  │
└─────────────┘               │  scheduler    │                   └─────────┘
                              └──────────────┘
```

1. Server membaca `config.json` (rotasi command, interval, limit)
2. Scheduler memilih command berikutnya → kirim teks ke Discord via
   `input text` (ADB) / rish (Shizuku) — bukan API
3. Sebelum tiap kirim, focus dicek: kalau bukan Discord → sesi stop
4. Browser kamu menampilkan state live lewat SSE

---

## Mulai Cepat

### 1. Prasyarat

| Kebutuhan | Catatan |
| --- | --- |
| [Termux](https://f-droid.org/packages/com.termux/) | Ambil dari F-Droid/GitHub — **bukan** Play Store |
| Node.js ≥ 20 | `pkg install nodejs` |
| Discord Android | + saluran yang ada **OwO Bot** |
| Wireless debugging (ADB) | Untuk pairing device ke dirinya sendiri — tanpa PC |

### 2. Instal

<!-- prettier-ignore -->
```sh
# opsi A — git (recommended, mudah update)
pkg update && pkg install -y nodejs git
git clone https://github.com/ItsCookie177/owo-macro-dashboard.git
cd owo-macro-dashboard

# opsi B — dari zip
pkg update && pkg install -y nodejs
unzip projek-makro-owo.zip -d ~/
cd ~/makro

# lanjutannya sama
npm install
node scripts/fix-termux-bins.mjs   # perbaiki wrapper npm khusus Termux
```

Update (opsi A): `git pull` lalu `npm install` lagi.

### 3. Pasang ADB — sekali saja

<!-- prettier-ignore -->
```sh
# 1. HP: Settings → Developer options → Wireless debugging → aktifkan
# 2. Tap "Pair device with pairing code" — catat kode 6 digit + port
#    (pakai split-screen supaya jendela pairing tidak keburu tertutup)
./scripts/setup-adb-pair.sh <pair-port> <kode>
#    contoh: ./scripts/setup-adb-pair.sh 37000 123456

# 3. Connect memakai port "IP address & Port" di layar yang sama
adb connect 127.0.0.1:<connect-port>

# 4. Izinkan "Allow USB debugging" yang muncul di layar HP
# 5. Verifikasi
./scripts/check-device.sh
```

> [!NOTE]
> Setelah **reboot**, wireless debugging mati — cukup ulangi langkah `adb connect`.
> Pernah nyambung dengan `adb tcpip 5555`? Cukup `adb connect 127.0.0.1:5555`.

### 4. Jalankan

```sh
npm start
```

Log menampilkan URL dashboard + token:

```
[server] akses PC: http://192.168.0.105:3000/?token=xxxxxxxxxxxxxxxx
```

Buka URL itu di browser — **HP** (di mode split/floating di atas Discord) atau
**PC** di Wi-Fi yang sama. `config.json` dibuat otomatis dengan token random
saat pertama jalan.

---

## Penggunaan

1. Buka **Discord di saluran bersama OwO Bot**
2. Di dashboard, atur **interval**, **rotasi command**, dan **batas** sesuai selera
3. Tekan **Start** → **pindah fokus ke Discord dalam 10 detik**
4. Sesi berjalan otomatis; **Stop** kapan saja

### Split-screen & floating window

Preflight cukup dengan Discord **terlihat** — jadi aman kalau dashboard dibuka
di pane browser split-screen, atau browser floating window di atas Discord.
Grace period 10 detik setelah Start adalah waktu kamu **tap Discord** supaya
focus (dan teks keyboard) masuk ke Discord, bukan ke browser.

### Perilaku auto-stop

| Kondisi | Alasan |
| --- | --- |
| Focus pindah dari Discord | `input text` selalu masuk ke window yang focus — kalau dipaksa, teks nyasar ke app lain |
| Gagal kirim 3× berturut-turut | Device tidak responsif / Discord tertutup |
| Lewat `maxSessionMin` (default 10 menit) | Sesi singkat sesuai desain |

> [!WARNING]
> Kalau kamu tap browser di tengah sesi (lihat statistik, dll), sesi **akan
> berhenti otomatis** — ini by design. Start lagi untuk lanjut.

### Akses dari PC

Server listen `0.0.0.0`. Satu Wi-Fi dengan HP → buka URL dari log. Device
selain `localhost` wajib menyertakan token (`?token=…`).

---

## Konfigurasi

Semua bisa diubah lewat dashboard; edit manual `config.json` juga boleh.

| Field | Default | Keterangan |
| --- | --- | --- |
| `intervalSec` | `30` | Jeda antar command (min 5; `owo hunt` cooldown ~15 dtk) |
| `maxSessionMin` | `10` | Batas durasi sesi, menit |
| `jitterSec` | `2` | Acak ± detik tiap interval, anti pola |
| `autoStopOnForegroundLoss` | `true` | Stop saat focus tinggalkan Discord |
| `rotation[]` | hunt/battle/cf/slots | Daftar command: `text`, `enabled`, `maxPerSession` (`null` = tanpa batas) |
| `selectors.composerId` | `""` | Auto-terisi dari Probe (`uiautomator dump`); kosong = blind send |
| `lanToken` | random | Token akses dari device lain |

---

## Diagnostik

```sh
./scripts/check-device.sh   # status adb, foreground, Discord terdeteksi?
npm run typecheck           # typecheck TypeScript
npm test                    # unit test (vitest)
```

Di dashboard, tombol **Probe** mengecek: adapter aktif, Discord terlihat /
focus, dan deteksi input composer. Hasil probe juga menyimpan `composerId` ke
config untuk kirim lebih akurat.

---

## Troubleshooting

| Gejala | Solusi |
| --- | --- |
| Start ditolak "Discord tidak terlihat" | Buka Discord di saluran OwO dulu |
| Sesi langsung auto-stop | Focus pindah ke app lain — biarkan focus di Discord selama sesi |
| `adb connect refused` | Wireless debugging mati / belum pair — ulangi [Pasang ADB](#3-pasang-adb--sekali-saja) |
| Ada device `emulator-5554` | Aman — adapter otomatis memilih serial device asli |
| `uiautomator dump` gagal | Layar sedang kunci / animasi berat — buka ulang Discord |
| Perubahan UI tidak kelihatan | Pakai `npm run dev` untuk mode development (hot reload) |

---

## Pengembangan

```sh
npm run dev      # Vite (web) + tsx watch (api) berdampingan
npm run build    # build frontend ke dist/
npm test         # vitest — mock adapter, tanpa device
npm run typecheck
```

Adapter dideteksi otomatis: `ShizukuAdapter` → `AdbAdapter` → `MockAdapter`.
Test unit memakai mock — aman dijalankan di mesin mana pun.

---

## Struktur Proyek

```
makro/
├── src/
│   ├── web/            # UI React — dashboard, SSE, kontrol
│   ├── server/
│   │   ├── adapters/   # adb, shizuku, mock + parser target
│   │   ├── core/       # scheduler, config store, session, logger
│   │   └── api/        # Express routes
│   └── shared/         # tipe + skema Zod (dipakai dua sisi)
├── scripts/            # fix-termux-bins, setup-adb-pair, check-device
├── index.html
└── config.json         # dibuat otomatis — jangan di-commit (ada token)
```

---

<div align="center">

Made for Termux · Gunakan dengan bijak pada akun kamu sendiri

</div>
