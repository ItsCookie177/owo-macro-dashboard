import { useEffect, useState } from 'react';
import type { Stats } from '../../shared/types';

const STATUS_LABEL: Record<Stats['status'], string> = {
  idle: 'IDLE',
  running: 'RUNNING',
  error: 'ERROR',
};

const STATUS_DOT: Record<Stats['status'], string> = {
  idle: 'bg-slate-400',
  running: 'bg-green-500',
  error: 'bg-red-500',
};

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Props = {
  stats: Stats;
  intervalSec: number;
};

export default function StatusCard({ stats, intervalSec }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (stats.status !== 'running') return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [stats.status]);

  const duration =
    stats.status === 'running' && stats.startedAt
      ? formatDuration(now - Date.parse(stats.startedAt))
      : '--:--';

  let countdown: string | null = null;
  if (stats.status === 'running' && stats.lastSentAt) {
    const elapsed = (now - Date.parse(stats.lastSentAt)) / 1000;
    const left = Math.max(0, Math.ceil(intervalSec - elapsed));
    countdown = `dalam ~${left}s`;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              STATUS_DOT[stats.status]
            }`}
          />
          <span className="text-sm font-semibold tracking-wide">
            {STATUS_LABEL[stats.status]}
          </span>
        </div>
        <span className="text-sm text-slate-600">Durasi {duration}</span>
      </div>
      <p className="mt-2 text-sm text-slate-700">
        {stats.status === 'running' ? (
          <>
            Berikutnya:{' '}
            <strong>{stats.nextCommandId ?? '—'}</strong>
            {countdown && <span className="text-slate-500"> ({countdown})</span>}
          </>
        ) : stats.status === 'error' ? (
          <span className="text-red-600">{stats.lastError ?? 'Terjadi error'}</span>
        ) : (
          <span className="text-slate-500">Siap dijalankan</span>
        )}
      </p>
    </section>
  );
}
