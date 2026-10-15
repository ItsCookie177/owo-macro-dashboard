import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, WifiOff } from 'lucide-react';
import { captchaRemainingMs, formatMMSS } from '../lib/captcha';

type Props = {
  message: string | null;
  sseDown: boolean;
  captchaAt: string | null;
};

export default function Banner({ message, sseDown, captchaAt }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!captchaAt) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [captchaAt]);

  if (!message && !sseDown && !captchaAt) return null;

  const expired =
    captchaAt !== null && captchaRemainingMs(captchaAt, now) <= 0;

  return (
    <div className="space-y-2">
      {captchaAt && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border border-danger-line bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger-ink">
          <ShieldAlert size={18} className="flex-none" />
          <span>
            <strong className="font-bold">VERIFIKASI HUMAN</strong>
            {expired ? (
              <> — jendela 10 menit habis, pantau akunmu di owobot.com.</>
            ) : (
              <>
                {' '}
                — sisa waktu{' '}
                <span className="font-mono font-bold tabular-nums">
                  {formatMMSS(captchaRemainingMs(captchaAt, now))}
                </span>
                . Selesaikan manual sekarang.
              </>
            )}
          </span>
          <a
            href="https://owobot.com/captcha"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary ml-auto !px-3 !py-1 text-xs"
          >
            Buka owobot.com/captcha
          </a>
        </div>
      )}
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
