#!/data/data/com.termux/files/usr/bin/sh
# Pasang pairing ADB wireless debugging ke device ini sendiri (tanpa PC).
#
# Cara pakai:
# 1. Buka Settings > Developer options > Wireless debugging (aktifkan).
# 2. Tap "Pair device with pairing code" — jendela dengan kode 6 digit + port.
# 3. Jalankan:  ./scripts/setup-adb-pair.sh <pair-port> <kode>
#    (pakai split-screen supaya jendela pairing tidak tertutup)
# 4. Setelah success, lihat port connect di layar (IP address & Port),
#    lalu:  adb connect 127.0.0.1:<connect-port>
# 5. Verifikasi:  ./scripts/check-device.sh

set -e
PORT="$1"
CODE="$2"

if [ -z "$PORT" ] || [ -z "$CODE" ]; then
  echo "Pemakaian: ./scripts/setup-adb-pair.sh <pair-port> <kode-6-digit>"
  echo "Contoh:   ./scripts/setup-adb-pair.sh 37000 123456"
  exit 1
fi

echo "Pairing ke 127.0.0.1:$PORT ..."
adb pair "127.0.0.1:$PORT" "$CODE"

echo ""
echo "Pairing selesai. Sekarang connect (cek port connect di layar Wireless debugging):"
echo "  adb connect 127.0.0.1:<connect-port>"
echo "Lalu verifikasi:"
echo "  ./scripts/check-device.sh"
