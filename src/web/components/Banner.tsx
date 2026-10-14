import { AlertTriangle, WifiOff } from 'lucide-react';

type Props = {
  message: string | null;
  sseDown: boolean;
};

export default function Banner({ message, sseDown }: Props) {
  if (!message && !sseDown) return null;
  return (
    <div className="space-y-2">
      {message && (
        <div className="flex items-start gap-2.5 rounded-[10px] border border-danger-line bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger-ink">
          <AlertTriangle size={17} className="mt-0.5 flex-none" />
          <span>{message}</span>
        </div>
      )}
      {sseDown && (
        <div className="flex items-center gap-2.5 rounded-[10px] border border-warn-line bg-warn-soft px-3.5 py-3 text-sm font-medium text-warn-ink">
          <WifiOff size={17} className="flex-none" />
          <span>Koneksi log terputus — mencoba ulang…</span>
        </div>
      )}
    </div>
  );
}
