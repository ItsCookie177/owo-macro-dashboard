#!/data/data/com.termux/files/usr/bin/sh
# Diagnostik device untuk OwO Macro Dashboard.
# Cek: adb terhubung/authorized, foreground app, rish/Shizuku, Discord package.

echo "== adb devices =="
adb devices -l

echo ""
echo "== coba shell =="
if adb shell echo ok 2>/dev/null; then
  echo "adb shell: OK"
else
  echo "adb shell: GAGAL (unauthorized? belum connect? lihat layar HP untuk dialog izin)"
fi

echo ""
echo "== foreground sekarang =="
adb shell dumpsys window 2>/dev/null | grep -E "mCurrentFocus|mFocusedApp" | head -2 || echo "(tidak bisa baca)"

echo ""
echo "== package Discord =="
adb shell pm list packages 2>/dev/null | grep -i discord || echo "(tidak terdeteksi / pm gagal)"

echo ""
echo "== rish / Shizuku =="
if [ -n "$RISH_PATH" ] && [ -x "$RISH_PATH" ]; then
  echo "RISH_PATH=$RISH_PATH (ada)"
elif [ -x "$HOME/rish" ]; then
  echo "$HOME/rish (ada) — set RISH_PATH=$HOME/rish"
else
  echo "rish tidak ditemukan (opsional — export dari app Shizuku, taruh di $HOME/rish)"
fi
