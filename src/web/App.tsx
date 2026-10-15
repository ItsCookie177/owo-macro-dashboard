import { useCallback, useEffect, useRef, useState } from 'react';
import type { LogEntry, PublicConfig, StateResponse } from '../shared/types';
import type { ConfigInput } from '../shared/schema';
import Banner from './components/Banner';
import ControlPanel from './components/ControlPanel';
import Diagnostik from './components/Diagnostik';
import LogViewer from './components/LogViewer';
import PresetsCard from './components/PresetsCard';
import RotationEditor from './components/RotationEditor';
import Sidebar, {
  MobileTopbar,
  PAGE_META,
  type PageId,
} from './components/Sidebar';
import StatsGrid from './components/StatsGrid';
import StatusCard from './components/StatusCard';
import {
  deletePreset,
  eventsUrl,
  getState,
  getPresets,
  putConfig,
  savePreset,
  startSession,
  stopSession,
  type Preset,
} from './hooks/useApi';
import { useEventStream } from './hooks/useEventStream';
import { alarmBeep, softBeep } from './lib/alarm';

const MAX_LOGS = 500;
const PAGE_IDS: PageId[] = [
  'dashboard',
  'rotasi',
  'statistik',
  'log',
  'diagnostik',
];

function pageFromHash(hash: string): PageId {
  const id = hash.replace(/^#\/?/, '') as PageId;
  return PAGE_IDS.includes(id) ? id : 'dashboard';
}

/** id unik untuk command baru (crypto.randomUUID butuh secure context). */
function newCommandId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

type ImportItem = { name: string; config: ConfigInput };

/** Terima {presets:[…]}, array, atau objek preset tunggal. */
function extractPresetItems(raw: unknown): ImportItem[] {
  let arr: unknown[];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === 'object') {
    const maybe = (raw as { presets?: unknown }).presets;
    arr = Array.isArray(maybe) ? maybe : [raw];
  } else {
    return [];
  }
  const out: ImportItem[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const { name, config } = item as { name?: unknown; config?: unknown };
    if (typeof name !== 'string' || !name.trim() || !config) continue;
    out.push({ name: name.trim().slice(0, 40), config: config as ConfigInput });
  }
  return out.slice(0, 50);
}

export default function App() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [minDelayValue, setMinDelayValue] = useState('22');
  const [maxDelayValue, setMaxDelayValue] = useState('48');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [page, setPage] = useState<PageId>(() =>
    pageFromHash(window.location.hash),
  );
  const initialized = useRef(false);

  // Sinkronkan halaman dengan hash URL (back/forward browser ikut jalan).
  useEffect(() => {
    function onHashChange() {
      setPage(pageFromHash(window.location.hash));
    }
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#dashboard');
    }
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function handleNavigate(id: PageId) {
    if (id === page) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.location.hash = id;
    setPage(id);
    window.scrollTo({ top: 0 });
  }

  const onState = useCallback((s: StateResponse) => {
    setState(s);
    if (!initialized.current) {
      initialized.current = true;
      setMinDelayValue(String(s.config.minDelaySec));
      setMaxDelayValue(String(s.config.maxDelaySec));
    }
  }, []);

  const refreshPresets = useCallback(() => {
    getPresets().then(setPresets).catch(() => {});
  }, []);

  useEffect(() => {
    refreshPresets();
    // State awal langsung diambil — tidak menunggu SSE open.
    getState()
      .then(onState)
      .catch(() => {});
  }, [refreshPresets, onState]);

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

  /** Patch config (rotation/shuffle/dll) → PUT sekali, state lokal ikut. */
  async function patchConfig(patch: Partial<PublicConfig>): Promise<void> {
    if (!state) return;
    setActionError(null);
    try {
      await putConfig({ ...state.config, ...patch });
      setState((prev) =>
        prev ? { ...prev, config: { ...prev.config, ...patch } } : prev,
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleToggle(id: string) {
    if (!state) return;
    const rotation = state.config.rotation.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c,
    );
    return patchConfig({ rotation });
  }

  function handleShuffleToggle(value: boolean) {
    return patchConfig({ shuffleOrder: value });
  }

  function handleAmountChange(id: string, amount: number | null) {
    if (!state) return;
    const rotation = state.config.rotation.map((c) =>
      c.id === id ? { ...c, amount } : c,
    );
    return patchConfig({ rotation });
  }

  function handleMaxChange(id: string, maxPerSession: number | null) {
    if (!state) return;
    const rotation = state.config.rotation.map((c) =>
      c.id === id ? { ...c, maxPerSession } : c,
    );
    return patchConfig({ rotation });
  }

  function handleDelete(id: string) {
    if (!state || state.config.rotation.length <= 1) return;
    return patchConfig({ rotation: state.config.rotation.filter((c) => c.id !== id) });
  }

  function handleAdd(text: string, amount: number | null) {
    if (!state) return;
    const rotation = [
      ...state.config.rotation,
      { id: newCommandId(), text, enabled: true, maxPerSession: null, amount },
    ];
    return patchConfig({ rotation });
  }

  async function handleSavePreset(name: string) {
    try {
      await savePreset(name);
      refreshPresets();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleLoadPreset(preset: Preset) {
    setActionError(null);
    try {
      const updated = await putConfig(preset.config);
      setState((prev) => (prev ? { ...prev, config: updated } : prev));
      setMinDelayValue(String(updated.minDelaySec));
      setMaxDelayValue(String(updated.maxDelaySec));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDeletePreset(name: string) {
    try {
      await deletePreset(name);
      refreshPresets();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleExportPresets() {
    const payload = {
      app: 'owo-macro-dashboard',
      kind: 'presets',
      version: 1,
      presets,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `owo-preset-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportPresets(file: File) {
    setActionError(null);
    try {
      const raw: unknown = JSON.parse(await file.text());
      const items = extractPresetItems(raw);
      if (items.length === 0) {
        throw new Error('tidak ada preset valid di file');
      }
      for (const item of items) {
        await savePreset(item.name, item.config);
      }
      refreshPresets();
    } catch (e) {
      setActionError(
        e instanceof Error
          ? `import gagal: ${e.message}`
          : `import gagal: ${e}`,
      );
    }
  }

  const running = state?.status === 'running';
  const meta = PAGE_META[page];
  const captchaAt =
    state?.stats.status === 'captcha' ? state.stats.captchaAt : null;

  // Alarm keras saat verifikasi terdeteksi / dilepas (bunyi + getar HP).
  const prevCaptcha = useRef(false);
  useEffect(() => {
    const active = captchaAt !== null;
    if (active && !prevCaptcha.current) alarmBeep();
    if (!active && prevCaptcha.current) softBeep();
    prevCaptcha.current = active;
  }, [captchaAt]);

  return (
    <div className="min-h-screen font-sans">
      <Sidebar page={page} onNavigate={handleNavigate} />
      <MobileTopbar page={page} onNavigate={handleNavigate} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-base/75 px-4 pt-5 pb-3 backdrop-blur-[4px] lg:px-8 lg:pt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink">
                {meta.title}
              </h1>
              <p className="mt-0.5 text-sm text-ink-2">{meta.subtitle}</p>
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
          </div>
        </header>

        <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4 pb-10 lg:max-w-3xl lg:px-8">
          <Banner message={actionError} sseDown={!connected} captchaAt={captchaAt} />
          {state ? (
            <>
              {page === 'dashboard' && (
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
                    captchaActive={captchaAt !== null}
                    onStart={() => void handleStart()}
                    onStop={() => void handleStop('normal')}
                    onEmergency={() => void handleStop('emergency')}
                  />
                </>
              )}
              {page === 'rotasi' && (
                <>
                  <PresetsCard
                    presets={presets}
                    disabled={running}
                    onSave={handleSavePreset}
                    onLoad={handleLoadPreset}
                    onDelete={handleDeletePreset}
                    onExport={handleExportPresets}
                    onImport={handleImportPresets}
                  />
                  <RotationEditor
                    rotation={state.config.rotation}
                    disabled={running}
                    shuffleOrder={state.config.shuffleOrder}
                    onToggle={(id) => void handleToggle(id)}
                    onShuffleToggle={(v) => void handleShuffleToggle(v)}
                    onAmountChange={(id, a) => void handleAmountChange(id, a)}
                    onMaxChange={(id, m) => void handleMaxChange(id, m)}
                    onDelete={(id) => void handleDelete(id)}
                    onAdd={(text, amount) => void handleAdd(text, amount)}
                  />
                </>
              )}
              {page === 'statistik' && <StatsGrid stats={state.stats} />}
              {page === 'log' && <LogViewer logs={logs} />}
              {page === 'diagnostik' && <Diagnostik />}
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
