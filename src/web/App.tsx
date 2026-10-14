import { useCallback, useEffect, useRef, useState } from 'react';
import type { LogEntry, StateResponse } from '../shared/types';
import type { ConfigInput } from '../shared/schema';
import Banner from './components/Banner';
import ControlPanel from './components/ControlPanel';
import Diagnostik from './components/Diagnostik';
import LogViewer from './components/LogViewer';
import RotationEditor from './components/RotationEditor';
import Sidebar, { MobileLogo, MobileNav } from './components/Sidebar';
import StatsGrid from './components/StatsGrid';
import StatusCard from './components/StatusCard';
import {
  eventsUrl,
  getState,
  putConfig,
  startSession,
  stopSession,
} from './hooks/useApi';
import { useEventStream } from './hooks/useEventStream';

const MAX_LOGS = 500;

export default function App() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [minDelayValue, setMinDelayValue] = useState('22');
  const [maxDelayValue, setMaxDelayValue] = useState('48');
  const [activeNav, setActiveNav] = useState('sesi');
  const initialized = useRef(false);

  const onState = useCallback((s: StateResponse) => {
    setState(s);
    if (!initialized.current) {
      initialized.current = true;
      setMinDelayValue(String(s.config.minDelaySec));
      setMaxDelayValue(String(s.config.maxDelaySec));
    }
  }, []);

  const onLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => {
      const next = [...prev, entry];
      return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
    });
  }, []);

  useEventStream(eventsUrl, {
    onState,
    onLog,
    onConnection: (up) => {
      setConnected(up);
      if (up) {
        getState().then(onState).catch(() => {});
      }
    },
  });

  async function handleStart() {
    if (!state) return;
    setBusy(true);
    setActionError(null);
    try {
      const minDelaySec = Number(minDelayValue.trim());
      const maxDelaySec = Number(maxDelayValue.trim());
      const payload: ConfigInput = {
        ...state.config,
        minDelaySec,
        maxDelaySec,
      };
      await putConfig(payload);
      setState((prev) =>
        prev
          ? { ...prev, config: { ...prev.config, minDelaySec, maxDelaySec } }
          : prev,
      );
      await startSession();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleStop(mode: 'normal' | 'emergency') {
    setBusy(true);
    setActionError(null);
    try {
      await stopSession(mode);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(id: string) {
    if (!state) return;
    setActionError(null);
    const rotation = state.config.rotation.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c,
    );
    const payload: ConfigInput = { ...state.config, rotation };
    try {
      await putConfig(payload);
      setState((prev) =>
        prev ? { ...prev, config: { ...prev.config, rotation } } : prev,
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleNavigate(id: string) {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  // Nav aktif mengikuti section yang terlihat di viewport.
  useEffect(() => {
    const ids = ['sesi', 'rotasi', 'statistik', 'log', 'diagnostik'];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveNav(entry.target.id);
        }
      },
      { rootMargin: '-30% 0px -55% 0px' },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [state]);

  const running = state?.status === 'running';

  return (
    <div className="min-h-screen font-sans">
      <Sidebar active={activeNav} onNavigate={handleNavigate} />
      <MobileLogo />
      <MobileNav active={activeNav} onNavigate={handleNavigate} />

      <div className="lg:pl-64">
        <header className="flex flex-wrap items-end justify-between gap-3 px-4 pt-6 pb-2 lg:px-8 lg:pt-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-ink-2">
              Kontrol sesi macro OwO — jalan lokal di HP kamu
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">adapter: {state?.adapter ?? '…'}</span>
            <span className="chip">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-pill ${
                  connected ? 'bg-live dot-live' : 'bg-ink-3'
                }`}
              />
              {connected ? 'live' : 'reconnect'}
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4 pb-10 lg:max-w-3xl lg:px-8">
          <Banner message={actionError} sseDown={!connected} />
          {state ? (
            <>
              <StatusCard
                stats={state.stats}
                maxDelaySec={state.config.maxDelaySec}
              />
              <ControlPanel
                minDelayValue={minDelayValue}
                maxDelayValue={maxDelayValue}
                onMinDelayChange={setMinDelayValue}
                onMaxDelayChange={setMaxDelayValue}
                running={running}
                busy={busy}
                onStart={() => void handleStart()}
                onStop={() => void handleStop('normal')}
                onEmergency={() => void handleStop('emergency')}
              />
              <div id="statistik" className="scroll-mt-24">
                <StatsGrid stats={state.stats} />
              </div>
              <RotationEditor
                rotation={state.config.rotation}
                disabled={running}
                onToggle={(id) => void handleToggle(id)}
              />
              <LogViewer logs={logs} />
              <Diagnostik />
            </>
          ) : (
            <section className="card">
              <p className="text-sm text-ink-2">Menghubungkan ke server…</p>
            </section>
          )}
          <p className="pt-2 text-center text-xs text-ink-3">
            Gunakan split-screen: Discord di atas, dashboard di bawah.
          </p>
        </main>
      </div>
    </div>
  );
}
