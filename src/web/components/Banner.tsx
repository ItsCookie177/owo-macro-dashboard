type Props = {
  message: string | null;
  sseDown: boolean;
};

export default function Banner({ message, sseDown }: Props) {
  if (!message && !sseDown) return null;
  return (
    <div className="space-y-2">
      {message && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </div>
      )}
      {sseDown && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Koneksi log terputus — mencoba ulang…
        </div>
      )}
    </div>
  );
}
