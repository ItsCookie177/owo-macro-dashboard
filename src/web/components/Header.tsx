type Props = {
  adapter: string;
  connected: boolean;
};

export default function Header({ adapter, connected }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <h1 className="text-lg font-semibold">OwO Macro</h1>
      <div className="flex items-center gap-3 text-xs">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
          adapter: {adapter}
        </span>
        <span className="flex items-center gap-1.5 text-slate-600">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connected ? 'bg-green-500' : 'bg-slate-400'
            }`}
          />
          {connected ? 'terhubung' : 'mencoba ulang'}
        </span>
      </div>
    </header>
  );
}
