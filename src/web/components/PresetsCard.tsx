import { useRef, useState } from 'react';
import {
  BookmarkPlus,
  Download,
  FileDown,
  FileUp,
  Save,
  Trash2,
} from 'lucide-react';
import type { Preset } from '../hooks/useApi';

type Props = {
  presets: Preset[];
  disabled: boolean;
  onSave: (name: string) => void | Promise<void>;
  onLoad: (preset: Preset) => void | Promise<void>;
  onDelete: (name: string) => void | Promise<void>;
  onExport: () => void;
  onImport: (file: File) => void | Promise<void>;
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PresetsCard({
  presets,
  disabled,
  onSave,
  onLoad,
  onDelete,
  onExport,
  onImport,
}: Props) {
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function submit() {
    const clean = name.trim();
    if (!clean) return;
    void onSave(clean);
    setName('');
  }

  return (
    <section className="card">
      <h2 className="card-title">
        <BookmarkPlus size={19} /> Preset
      </h2>
      <p className="mt-1 text-xs text-ink-3">
        Simpan rotasi + delay saat ini sebagai preset, muat ulang kapan saja.
      </p>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="text"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama preset… (harian-gambling)"
          disabled={disabled}
          className="input flex-1 text-sm"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={disabled || !name.trim()}
        >
          <Save size={16} /> Simpan
        </button>
      </form>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost !px-2.5 !py-1 text-xs"
          disabled={disabled}
          title="Impor preset dari file JSON"
          onClick={() => fileRef.current?.click()}
        >
          <FileUp size={14} /> Import
        </button>
        <button
          type="button"
          className="btn btn-ghost !px-2.5 !py-1 text-xs"
          disabled={disabled || presets.length === 0}
          title="Ekspor semua preset ke file JSON"
          onClick={onExport}
        >
          <FileDown size={14} /> Export
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onImport(file);
            e.target.value = '';
          }}
        />
      </div>

      {presets.length === 0 ? (
        <p className="mt-3 text-xs text-ink-3">Belum ada preset tersimpan.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {presets.map((p) => (
            <li key={p.name} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {p.name}
                </p>
                <p className="text-xs text-ink-3">
                  {shortDate(p.savedAt)} · {p.config.rotation.length} command ·{' '}
                  {p.config.minDelaySec}-{p.config.maxDelaySec}s
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost !px-2.5 !py-1 text-xs"
                disabled={disabled}
                title="Muat preset ini"
                onClick={() => void onLoad(p)}
              >
                <Download size={14} /> Muat
              </button>
              <button
                type="button"
                className="btn btn-ghost !px-2 !py-1 text-ink-3 hover:!text-danger-ink"
                title="Hapus preset"
                onClick={() => void onDelete(p.name)}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
