import { useState } from 'react';
import { Radar } from 'lucide-react';
import { probe } from '../hooks/useApi';

type ProbeResult = {
  ok: boolean;
  adapter: string;
  foreground?: boolean;
  visible?: boolean;
  dumpOk?: boolean;
  composerId?: string | null;
  hint?: string;
  reason?: string;
};

export default function Diagnostik() {
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleProbe() {
    setBusy(true);
    setError(null);
    try {
      setResult(await probe());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="diagnostik" className="card scroll-mt-24">
      <h2 className="card-title">
        <Radar size={19} /> Diagnostik
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        Cek adapter, apakah Discord terlihat/focus, dan composer terdeteksi.
      </p>
      <div className="mt-3">
        <button
          type="button"
          onClick={() => void handleProbe()}
          disabled={busy}
          className="btn btn-ghost"
        >
          <Radar size={16} /> {busy ? 'Memeriksa…' : 'Probe device'}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm font-medium text-danger-ink">{error}</p>
      )}
      {result && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="chip">adapter: {result.adapter}</span>
            <span
              className={`chip ${result.foreground ? 'chip-accent' : ''}`}
            >
              focus: {result.foreground ? 'Discord' : 'bukan Discord'}
            </span>
            <span className={`chip ${result.visible ? 'chip-accent' : ''}`}>
              terlihat: {result.visible ? 'ya' : 'tidak'}
            </span>
            <span className="chip">
              dump: {result.dumpOk ? 'ok' : 'gagal'}
            </span>
            {result.composerId && (
              <span className="chip">composer: {result.composerId}</span>
            )}
          </div>
          {result.hint && (
            <p className="text-sm text-ink-2">{result.hint}</p>
          )}
        </div>
      )}
    </section>
  );
}
