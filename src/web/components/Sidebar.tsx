import { BarChart3, Gauge, Menu, Radar, ScrollText, Shuffle, X } from 'lucide-react';

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

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
      <span
        className={`flex items-center justify-center rounded-[10px] bg-accent text-white ${
          compact ? 'h-8 w-8' : 'h-10 w-10'
        }`}
      >
        <svg
          viewBox="0 0 256 256"
          className={compact ? 'h-[20px] w-[20px]' : 'h-[26px] w-[26px]'}
          fill="none"
          aria-hidden="true"
        >
          <g
            stroke="currentColor"
            strokeWidth="17"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="78" cy="99" r="35" />
            <circle cx="178" cy="99" r="35" />
            <path d="M 92 163 L 110 194.2 L 128 163 L 146 194.2 L 164 163" />
          </g>
        </svg>
      </span>
      <div>
        <p className="text-[0.95rem] leading-tight font-extrabold text-ink">
          OwO Macro
        </p>
        {!compact && (
          <p className="font-mono text-[0.7rem] text-ink-3">v0.4.0</p>
        )}
      </div>
    </div>
  );
}

type Props = {
  page: PageId;
  onNavigate: (id: PageId) => void;
};

type SidebarProps = Props & {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ page, onNavigate, open, onClose }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col border-r border-line bg-surface px-4 py-6 transition-transform duration-200 ease-out lg:z-30 lg:translate-x-0 ${
        open ? 'translate-x-0' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <Logo />
        <button
          type="button"
          className="btn btn-ghost -mt-1 !px-2 !py-1.5 lg:hidden"
          aria-label="Tutup menu"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
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

export function MobileTopbar({
  page,
  onMenu,
  menuOpen,
}: {
  page: PageId;
  onMenu: () => void;
  menuOpen: boolean;
}) {
  const meta = PAGE_META[page];
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-base/75 backdrop-blur-[4px] lg:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="btn btn-ghost !px-2.5 !py-2"
          aria-label="Buka menu navigasi"
          aria-expanded={menuOpen}
          onClick={onMenu}
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-ink">
            {meta.title}
          </p>
        </div>
        <Logo compact />
      </div>
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
