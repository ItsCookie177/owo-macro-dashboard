import { Shuffle } from 'lucide-react';
import type { CommandDef } from '../../shared/types';

type Props = {
  rotation: CommandDef[];
  disabled: boolean;
  onToggle: (id: string) => void;
};

export default function RotationEditor({ rotation, disabled, onToggle }: Props) {
  return (
    <section id="rotasi" className="card scroll-mt-24">
      <h2 className="card-title">
        <Shuffle size={19} /> Rotasi Command
      </h2>
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
              className={`flex-1 cursor-pointer font-mono text-sm ${
                cmd.enabled ? 'text-ink' : 'text-ink-3 line-through'
              }`}
            >
              {cmd.text}
            </label>
            <span
              className={`chip ${cmd.maxPerSession === null ? '' : 'chip-accent'}`}
            >
              {cmd.maxPerSession === null ? '∞' : `${cmd.maxPerSession}×`}
            </span>
          </li>
        ))}
      </ul>
      {disabled && (
        <p className="mt-2 text-xs text-ink-3">
          Berhenti dulu untuk mengubah rotasi.
        </p>
      )}
    </section>
  );
}
