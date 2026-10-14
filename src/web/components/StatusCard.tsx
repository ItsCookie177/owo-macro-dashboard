import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Stats } from '../../shared/types';

const STATUS_LABEL: Record<Stats['status'], string> = {
  idle: 'IDLE',
  running: 'BERJALAN',
  error: 'ERROR',
};

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Props = {
  stats: Stats;
  maxDelaySec: number;
};

export default function StatusCard({ stats, maxDelaySec }: Props) {
  const status = stats.status;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== 'running') return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [status]);

  const dotClass =
    status === 'running'
      ? 'bg-live dot-live'
      : status === 'error'
        ? 'bg-accent'
        : 'bg-ink-3';

  const pillClass =
    status === 'running'
      ? 'bg-accent-soft text-accent-ink'
      : status === 'error'
        ? 'bg-danger-soft text-danger-ink'
        : 'bg-base text-ink-2';

  return (
    <section id="sesi" className="card scroll-mt-24">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-bold tracking-wide ${pillClass}`}
        >
          <span className={`inline-block h-2 w-2 rounded-pill ${dotClass}`} />
          {STATUS_LABEL[status]}
        </span>
        {status === 'running' && stats.startedAt && (
          <span className="font-mono text-sm text-ink-2 tabular-nums">
            Durasi {formatDuration(now - Date.parse(stats.startedAt))}
          </span>
        )}
      </div>

      {status === 'error' && stats.lastError ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-danger-line bg-danger-soft px-3.5 py-3 text-sm text-danger-ink">
          <AlertTriangle size={18} className="mt-0.5 flex-none" />
          <span>{stats.lastError}</span>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-[0.7rem] font-bold tracking-[0.14em] text-ink-3 uppercase">
            Berikutnya
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-mono text-3xl font-semibold text-ink sm:text-[2.1rem]">
              {status === 'running' ? (stats.nextCommandId ?? '—') : '—'}
            </span>
            {status === 'running' && (
              <CountdownBadge stats={stats} maxDelaySec={maxDelaySec} now={now} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function CountdownBadge({
  stats,
  maxDelaySec,
  now,
}: {
  stats: Stats;
  maxDelaySec: number;
  now: number;
}) {
  if (stats.nextAt) {
    const left = Math.max(
      0,
      Math.ceil((Date.parse(stats.nextAt) - now) / 1000),
    );
    return (
      <span className="rounded-pill bg-accent-soft px-2.5 py-1 font-mono text-sm font-semibold text-accent-ink tabular-nums">
        {left > 0 ? `${left}s lagi` : 'segera'}
      </span>
    );
  }
  if (stats.lastSentAt) {
    const elapsed = (now - Date.parse(stats.lastSentAt)) / 1000;
    const left = Math.max(0, Math.ceil(maxDelaySec - elapsed));
    return (
      <span className="rounded-pill bg-base px-2.5 py-1 font-mono text-sm text-ink-2 tabular-nums">
        maks ~{left}s
      </span>
    );
  }
  return (
    <span className="rounded-pill bg-base px-2.5 py-1 font-mono text-sm text-ink-3">
      mulai…
    </span>
  );
}
