import { useCallback, useRef, useState } from 'react';
import type { LogEntry, StateResponse } from '../shared/types';
import type { ConfigInput } from '../shared/schema';
import Banner from './components/Banner';
import ControlPanel from './components/ControlPanel';
import Header from './components/Header';
import LogViewer from './components/LogViewer';
import RotationEditor from './components/RotationEditor';
import StatsGrid from './components/StatsGrid';
import StatusCard from './components/StatusCard';
import { eventsUrl, getState, putConfig, startSession, stopSession } from './hooks/useApi';
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
          ? {
              ...prev,
              config: { ...prev.config, minDelaySec, maxDelaySec },
            }
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

  const running = state?.status === 'running';

  return (
    <div className="min-h-screen bg-slate-50">
      <Header adapter={state?.adapter ?? '…'} connected={connected} />
      <main className="mx-auto max-w-xl space-y-3 p-4">
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
            <StatsGrid stats={state.stats} />
            <RotationEditor
              rotation={state.config.rotation}
              disabled={running}
              onToggle={(id) => void handleToggle(id)}
            />
            <LogViewer logs={logs} />
            <p className="pb-4 text-center text-xs text-slate-400">
              Gunakan split-screen: Discord di atas, dashboard di bawah.
            </p>
          </>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Menghubungkan ke server…
          </p>
        )}
      </main>
    </div>
  );
}
