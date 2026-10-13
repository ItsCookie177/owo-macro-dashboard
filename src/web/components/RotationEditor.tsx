import type { CommandDef } from '../../shared/types';

type Props = {
  rotation: CommandDef[];
  disabled: boolean;
  onToggle: (id: string) => void;
};

export default function RotationEditor({ rotation, disabled, onToggle }: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-medium text-slate-700">Rotasi Command</h2>
      <ul className="mt-2 space-y-2">
        {rotation.map((cmd) => (
          <li key={cmd.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              id={`cmd-${cmd.id}`}
              checked={cmd.enabled}
              disabled={disabled}
              onChange={() => onToggle(cmd.id)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
            />
            <label
              htmlFor={`cmd-${cmd.id}`}
              className={`flex-1 text-sm ${
                cmd.enabled ? 'text-slate-800' : 'text-slate-400 line-through'
              }`}
            >
              {cmd.text}
            </label>
            <span className="text-xs text-slate-500">
              {cmd.maxPerSession === null ? '∞' : `limit ${cmd.maxPerSession}`}
            </span>
          </li>
        ))}
      </ul>
      {disabled && (
        <p className="mt-2 text-xs text-slate-400">
          Berhenti dulu untuk mengubah rotasi.
        </p>
      )}
    </section>
  );
}
