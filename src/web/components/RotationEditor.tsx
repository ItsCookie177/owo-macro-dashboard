import { useState } from 'react';
import { Plus, Shuffle, Trash2 } from 'lucide-react';
import type { CommandDef } from '../../shared/types';
import { isMoneyCommand, MONEY_SUGGESTIONS } from '../../shared/money';

type Props = {
  rotation: CommandDef[];
  disabled: boolean;
  shuffleOrder: boolean;
  onToggle: (id: string) => void;
  onShuffleToggle: (value: boolean) => void;
  onAmountChange: (id: string, amount: number | null) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string, amount: number | null) => void;
};

export default function RotationEditor({
  rotation,
  disabled,
  shuffleOrder,
  onToggle,
  onShuffleToggle,
  onAmountChange,
  onDelete,
  onAdd,
}: Props) {
  const [newText, setNewText] = useState('');

  function commitAmount(id: string, raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      onAmountChange(id, null);
      return;
    }
    const n = Math.floor(Number(trimmed));
    if (!Number.isFinite(n) || n < 1) return;
    onAmountChange(id, Math.min(n, 10_000_000_000));
  }

  function submitAdd() {
    const text = newText.trim();
    if (!text) return;
    onAdd(text, null);
    setNewText('');
  }

  return (
    <section id="rotasi" className="card scroll-mt-24">
      <div className="flex items-center justify-between gap-3">
        <h2 className="card-title">
          <Shuffle size={19} /> Rotasi Command
        </h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            className="switch"
            checked={shuffleOrder}
            disabled={disabled}
            onChange={(e) => onShuffleToggle(e.target.checked)}
          />
          Acak urutan
        </label>
      </div>

      <ul className="mt-3 divide-y divide-line">
        {rotation.map((cmd) => (
          <li key={cmd.id} className="flex items-center gap-3 py-2.5">
            <input
              type="checkbox"
              id={`cmd-${cmd.id}`}
              checked={cmd.enabled}
              disabled={disabled}
              onChange={() => onToggle(cmd.id)}
              className="switch"
            />
            <label
              htmlFor={`cmd-${cmd.id}`}
              className={`min-w-0 flex-1 cursor-pointer font-mono text-sm ${
                cmd.enabled ? 'text-ink' : 'text-ink-3 line-through'
              }`}
            >
              {cmd.text}
            </label>
            {isMoneyCommand(cmd.text) && (
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={10_000_000_000}
                placeholder="koin"
                title="Jumlah koin (opsional — dikirim sebagai nominal)"
                disabled={disabled}
                defaultValue={cmd.amount ?? ''}
                onBlur={(e) => commitAmount(cmd.id, e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    commitAmount(cmd.id, e.currentTarget.value);
                }}
                className="input w-20 text-right font-mono text-xs"
              />
            )}
            <span
              className={`chip ${cmd.maxPerSession === null ? '' : 'chip-accent'}`}
            >
              {cmd.maxPerSession === null ? '∞' : `${cmd.maxPerSession}×`}
            </span>
            <button
              type="button"
              className="btn btn-ghost !px-2 !py-1 text-ink-3 hover:!text-danger-ink"
              disabled={disabled || rotation.length <= 1}
              title="Hapus command"
              onClick={() => onDelete(cmd.id)}
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitAdd();
        }}
      >
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Tambah command… (owo slots)"
          disabled={disabled}
          className="input flex-1 font-mono text-sm"
        />
        <button
          type="submit"
          className="btn btn-primary whitespace-nowrap"
          disabled={disabled || !newText.trim()}
        >
          <Plus size={16} /> Tambah
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {MONEY_SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            type="button"
            className="chip hover:bg-ink/5"
            disabled={disabled}
            title={
              s.money
                ? 'Command uang — isi nominal koin setelah ditambah'
                : 'Penghasil koin'
            }
            onClick={() => setNewText(s.text)}
          >
            {s.text}
          </button>
        ))}
      </div>

      {disabled && (
        <p className="mt-2 text-xs text-ink-3">
          Berhenti dulu untuk mengubah rotasi.
        </p>
      )}
    </section>
  );
}
