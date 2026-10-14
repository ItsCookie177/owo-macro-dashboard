import { BarChart3, Gauge, PawPrint, ScrollText, Shuffle } from 'lucide-react';

const NAV = [
  { id: 'sesi', label: 'Sesi', icon: Gauge },
  { id: 'rotasi', label: 'Rotasi', icon: Shuffle },
  { id: 'statistik', label: 'Statistik', icon: BarChart3 },
  { id: 'log', label: 'Log', icon: ScrollText },
] as const;

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
  active: string;
  onNavigate: (id: string) => void;
};

export default function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
      <Logo />
      <nav className="mt-8 space-y-1">
        {NAV.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(id);
            }}
            className={`nav-item ${active === id ? 'nav-item-active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </a>
        ))}
      </nav>
      <p className="mt-auto text-[0.7rem] leading-relaxed text-ink-3">
        UI automation lokal · tanpa token Discord
      </p>
    </aside>
  );
}

export function MobileNav({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <nav className="flex gap-1.5 overflow-x-auto px-4 pt-3 pb-1 lg:hidden">
      {NAV.map(({ id, label, icon: Icon }) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(id);
          }}
          className={`chip flex-none cursor-pointer ${
            active === id ? 'chip-accent' : ''
          }`}
        >
          <Icon size={13} />
          {label}
        </a>
      ))}
    </nav>
  );
}

export function MobileLogo() {
  return (
    <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
      <Logo />
    </div>
  );
}
