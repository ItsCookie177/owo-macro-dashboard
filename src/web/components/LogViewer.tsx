import { useEffect, useRef, useState } from 'react';
import { ScrollText } from 'lucide-react';
import type { LogEntry } from '../../shared/types';

const LEVEL_STYLE: Record<LogEntry['level'], string> = {
  info: 'text-[#cfc4b4]',
  warn: 'text-[#e8b86a]',
  error: 'text-[#f0907e]',
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
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    setFollow(nearBottom);
  }

  return (
    <section id="log" className="card scroll-mt-24">
      <div className="flex items-center justify-between">
        <h2 className="card-title">
          <ScrollText size={19} /> Log
        </h2>
        <button
          type="button"
          onClick={() => setFollow((f) => !f)}
          className={`chip cursor-pointer transition-colors hover:bg-base ${
            follow ? 'chip-accent' : ''
          }`}
        >
          {follow ? 'Ikuti: on' : 'Ikuti: off'}
        </button>
      </div>
      <div
        ref={boxRef}
        onScroll={handleScroll}
        className="mt-3 h-56 overflow-y-auto rounded-[10px] bg-[#24201c] p-3 font-mono text-xs leading-relaxed"
      >
        {logs.length === 0 ? (
          <p className="text-[#8a8074]">Belum ada aktivitas.</p>
        ) : (
          logs.map((entry, i) => (
            <div key={`${entry.ts}-${i}`} className={LEVEL_STYLE[entry.level]}>
              <span className="text-[#8a8074]">{formatTime(entry.ts)}</span>{' '}
              {entry.msg}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
