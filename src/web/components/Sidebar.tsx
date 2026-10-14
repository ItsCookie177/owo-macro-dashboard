import { BarChart3, Gauge, PawPrint, Radar, ScrollText, Shuffle } from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'rotasi'
  | 'statistik'
  | 'log'
  | 'diagnostik';

const NAV: { id: PageId; label: string; icon: typeof Gauge }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge },
  { id: 'rotasi', label: 'Rotasi', icon: Shuffle },
  { id: 'statistik', label: 'Statistik', icon: BarChart3 },
  { id: 'log', label: 'Log', icon: ScrollText },
  { id: 'diagnostik', label: 'Diagnostik', icon: Radar },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent text-white">
        <PawPrint size={22} />
      </span>
      <div>
        <p className="text-[0.95rem] leading-tight font-extrabold text-ink">
          OwO Macro
        </p>
        <p className="font-mono text-[0.7rem] text-ink-3">v0.2.0</p>
      </div>
    </div>
  );
}

type Props = {
  page: PageId;
  onNavigate: (id: PageId) => void;
};

export default function Sidebar({ page, onNavigate }: Props) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
      <Logo />
      <nav className="mt-8 space-y-1">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            aria-current={page === id ? 'page' : undefined}
            className={`nav-item w-full ${page === id ? 'nav-item-active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      <p className="mt-auto text-[0.7rem] leading-relaxed text-ink-3">
        UI automation lokal · tanpa token Discord
      </p>
    </aside>
  );
}

export function MobileTopbar({ page, onNavigate }: Props) {
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-base/75 backdrop-blur-[4px] lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Logo />
      </div>
      <nav className="flex gap-1.5 overflow-x-auto px-4 pb-2.5">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            aria-current={page === id ? 'page' : undefined}
            className={`chip flex-none cursor-pointer ${
              page === id ? 'chip-accent' : ''
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export const PAGE_META: Record<
  PageId,
  { title: string; subtitle: string }
> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Kendali sesi macro OwO — jalan lokal di HP kamu',
  },
  rotasi: {
    title: 'Rotasi Command',
    subtitle: 'Aktifkan/matiakan command dan batas penggunaan per sesi',
  },
  statistik: {
    title: 'Statistik Sesi',
    subtitle: 'Jumlah command terkirim per jenis sejak sesi dimulai',
  },
  log: {
    title: 'Log Aktivitas',
    subtitle: 'Riwayat event scheduler, adapter, dan kesalahan',
  },
  diagnostik: {
    title: 'Diagnostik',
    subtitle: 'Cek adapter, focus Discord, dan deteksi kolom chat',
  },
};
