import { AlertTriangle, Play, Square } from 'lucide-react';

export type DelayValidation =
  | { ok: true; min: number; max: number; warn: string | null }
  | { ok: false; error: string };

export function parseDelayField(raw: string): number | null {
  const v = raw.trim();
  if (v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

export function validateDelayRange(
  minRaw: string,
  maxRaw: string,
): DelayValidation {
  const min = parseDelayField(minRaw);
  const max = parseDelayField(maxRaw);
  if (min === null || max === null) {
    return { ok: false, error: 'Isi kedua kolom dengan bilangan bulat' };
  }
  if (min < 5 || max > 600) {
    return { ok: false, error: 'Rentang 5–600 detik' };
  }
  if (max < min) {
    return { ok: false, error: 'Maks harus ≥ min' };
  }
  const warn =
    min < 15 ? 'Min di bawah cooldown OwO (~15 detik)' : null;
  return { ok: true, min, max, warn };
}

type Props = {
  minDelayValue: string;
  maxDelayValue: string;
  onMinDelayChange: (v: string) => void;
  onMaxDelayChange: (v: string) => void;
  running: boolean;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
  onEmergency: () => void;
};

export default function ControlPanel({
  minDelayValue,
  maxDelayValue,
  onMinDelayChange,
  onMaxDelayChange,
  running,
  busy,
  onStart,
  onStop,
  onEmergency,
}: Props) {
  const validation = validateDelayRange(minDelayValue, maxDelayValue);
  const inputClass =
    'w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <span className="block text-sm font-medium text-slate-700">
        Jeda antar command (acak)
      </span>
      <div className="mt-1 flex items-center gap-2">
        <input
          aria-label="Jeda minimum"
          type="text"
          inputMode="numeric"
          value={minDelayValue}
          disabled={running}
          onChange={(e) => onMinDelayChange(e.target.value)}
          className={inputClass}
        />
        <span className="text-sm text-slate-500">–</span>
        <input
          aria-label="Jeda maksimum"
          type="text"
          inputMode="numeric"
          value={maxDelayValue}
          disabled={running}
          onChange={(e) => onMaxDelayChange(e.target.value)}
          className={inputClass}
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
