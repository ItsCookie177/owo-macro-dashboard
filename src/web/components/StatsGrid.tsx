import type { Stats } from '../../shared/types';

type Props = {
  stats: Stats;
};

const ORDER = ['hunt', 'battle', 'cf', 'slots'] as const;

export default function StatsGrid({ stats }: Props) {
  const cells: Array<{ label: string; value: number }> = [
    { label: 'Total', value: stats.totalSent },
    ...ORDER.map((id) => ({
      label: id,
      value: stats.perCommand[id] ?? 0,
    })),
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-medium text-slate-700">Statistik</h2>
      <dl className="mt-2 grid grid-cols-5 gap-2 text-center">
        {cells.map((c) => (
          <div key={c.label} className="rounded-lg bg-slate-50 py-2">
            <dt className="text-xs text-slate-500">{c.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{c.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
