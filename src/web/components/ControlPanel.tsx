import { AlertTriangle, Play, Square, Zap } from 'lucide-react';

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
  const warn = min < 15 ? 'Min di bawah cooldown OwO (~15 detik)' : null;
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

  return (
    <section className="card">
      <h2 className="card-title">
        <Play size={19} /> Kendali Sesi
      </h2>

      <div className="mt-4">
        <span className="text-sm font-semibold text-ink">
          Jeda antar command
        </span>
        <p className="text-xs text-ink-2">
          Diacak acak di dalam rentang tiap kirim — anti pola.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            aria-label="Jeda minimum"
            type="text"
            inputMode="numeric"
            value={minDelayValue}
            disabled={running}
            onChange={(e) => onMinDelayChange(e.target.value)}
            className="input w-20"
          />
          <span className="text-ink-3">–</span>
          <input
            aria-label="Jeda maksimum"
            type="text"
            inputMode="numeric"
            value={maxDelayValue}
            disabled={running}
            onChange={(e) => onMaxDelayChange(e.target.value)}
            className="input w-20"
          />
          <span className="text-sm text-ink-2">detik</span>
        </div>
        {!validation.ok && (
          <p className="mt-1.5 text-xs font-medium text-danger-ink">
            {validation.error}
          </p>
        )}
        {validation.ok && validation.warn && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-warn-ink">
            <AlertTriangle size={12} /> {validation.warn}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onStart}
          disabled={running || busy || !validation.ok}
          className="btn btn-primary"
        >
          <Play size={16} /> {busy ? 'Memulai…' : 'Start'}
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={!running || busy}
          className="btn btn-ghost"
        >
          <Square size={16} /> Stop
        </button>
        <button
          type="button"
          onClick={onEmergency}
          disabled={!running || busy}
          className="btn btn-danger"
        >
          <Zap size={16} /> Emergency
        </button>
      </div>

      <p className="mt-3 text-xs text-ink-3">
        Setelah Start, pindah fokus ke Discord dalam 10–18 detik.
      </p>
    </section>
  );
}
