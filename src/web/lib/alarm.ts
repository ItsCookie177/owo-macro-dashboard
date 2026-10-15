let ctx: AudioContext | null = null;

function tone(freq: number, at: number, dur: number, gainPeak: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(gainPeak, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** Alarm 3 nada + getar — dipanggil saat verifikasi human terdeteksi. */
export function alarmBeep(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      tone(988, t0 + i * 0.3, 0.18, 0.12);
    }
  } catch {
    /* audio diblokir browser tanpa gesture */
  }
  try {
    navigator.vibrate?.([300, 120, 300, 120, 300]);
  } catch {
    /* tidak didukung */
  }
}

/** Nada pendek — verifikasi selesai / sesi siap lanjut. */
export function softBeep(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    tone(660, ctx.currentTime, 0.16, 0.08);
  } catch {
    /* abaikan */
  }
  try {
    navigator.vibrate?.(120);
  } catch {
    /* tidak didukung */
  }
}
