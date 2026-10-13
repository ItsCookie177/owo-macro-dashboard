import { AlertTriangle, Play, Square } from 'lucide-react';

export type IntervalValidation =
  | { ok: true; value: number; warn: string | null }
  | { ok: false; error: string };

export function validateInterval(raw: string): IntervalValidation {
  const v = raw.trim();
  if (v === '') return { ok: false, error: 'Masukkan angka' };
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, error: 'Harus bilangan bulat' };
  }
  if (n < 5) return { ok: false, error: 'Min 5 detik' };
  if (n > 600) return { ok: false, error: 'Maks 600 detik' };
  if (n < 15) {
    return { ok: true, value: n, warn: 'Di bawah cooldown OwO (~15 detik)' };
  }
  return { ok: true, value: n, warn: null };
}

type Props = {
  intervalValue: string;
  onIntervalChange: (v: string) => void;
  running: boolean;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
  onEmergency: () => void;
};

export default function ControlPanel({
  intervalValue,
  onIntervalChange,
  running,
  busy,
  onStart,
  onStop,
  onEmergency,
}: Props) {
  const validation = validateInterval(intervalValue);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <label
        htmlFor="interval"
        className="block text-sm font-medium text-slate-700"
      >
        Interval
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id="interval"
          type="text"
          inputMode="numeric"
          value={intervalValue}
          disabled={running}
          onChange={(e) => onIntervalChange(e.target.value)}
          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
        />
        <span className="text-sm text-slate-600">detik</span>
      </div>
      {!validation.ok && (
        <p className="mt-1 text-xs text-red-600">{validation.error}</p>
      )}
      {validation.ok && validation.warn && (
        <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle size={12} /> {validation.warn}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onStart}
          disabled={running || busy || !validation.ok}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play size={16} /> {busy ? 'Memulai…' : 'Start'}
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={!running || busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Square size={16} /> Stop
        </button>
        <button
          type="button"
          onClick={onEmergency}
          disabled={!running || busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <AlertTriangle size={16} /> Emergency Stop
        </button>
      </div>
    </section>
  );
}
