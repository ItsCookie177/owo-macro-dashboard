import { BarChart3 } from 'lucide-react';
import type { Stats } from '../../shared/types';

type Props = {
  stats: Stats;
};

const ORDER = ['hunt', 'battle', 'cf', 'slots'] as const;

export default function StatsGrid({ stats }: Props) {
  return (
    <section className="card">
      <h2 className="card-title">
        <BarChart3 size={19} /> Statistik Sesi
      </h2>
      <dl className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        <div className="rounded-[10px] bg-accent-soft px-3 py-2.5 text-center">
          <dt className="text-[0.7rem] font-bold tracking-wide text-accent-ink uppercase">
            Total
          </dt>
          <dd className="mt-0.5 font-mono text-2xl font-semibold text-accent-ink tabular-nums">
            {stats.totalSent}
          </dd>
        </div>
        {ORDER.map((id) => (
          <div key={id} className="rounded-[10px] bg-base px-3 py-2.5 text-center">
            <dt className="font-mono text-[0.7rem] font-semibold tracking-wide text-ink-3 uppercase">
              {id}
            </dt>
            <dd className="mt-0.5 font-mono text-xl font-semibold text-ink tabular-nums">
              {stats.perCommand[id] ?? 0}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
