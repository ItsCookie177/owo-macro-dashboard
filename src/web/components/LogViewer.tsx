import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '../../shared/types';

const LEVEL_STYLE: Record<LogEntry['level'], string> = {
  info: 'text-slate-700',
  warn: 'text-amber-700',
  error: 'text-red-700',
};

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('id-ID', { hour12: false });
}

type Props = {
  logs: LogEntry[];
};

export default function LogViewer({ logs }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);

  useEffect(() => {
    if (!follow) return;
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [logs, follow]);

  function handleScroll() {
    const box = boxRef.current;
    if (!box) return;
    const nearBottom =
      box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    setFollow(nearBottom);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-700">Log</h2>
        <button
          type="button"
          onClick={() => setFollow((f) => !f)}
          className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
        >
          {follow ? 'Ikuti: on' : 'Ikuti: off'}
        </button>
      </div>
      <div
        ref={boxRef}
        onScroll={handleScroll}
        className="mt-2 h-56 overflow-y-auto rounded-lg bg-slate-50 p-2 font-mono text-xs leading-relaxed"
      >
        {logs.length === 0 ? (
          <p className="text-slate-400">Belum ada aktivitas.</p>
        ) : (
          logs.map((entry, i) => (
            <div key={`${entry.ts}-${i}`} className={LEVEL_STYLE[entry.level]}>
              {formatTime(entry.ts)} {entry.level} {entry.msg}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
