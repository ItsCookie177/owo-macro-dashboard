import type { Express } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import {
  configSchema,
  startSchema,
  stopSchema,
} from '../../shared/schema.js';
import type { AppConfig, LogEntry } from '../../shared/types.js';
import type { AutomationAdapter } from '../adapters/types.js';
import { parseComposerId } from '../adapters/target.js';
import type { ConfigStore } from '../core/config.js';
import type { Logger } from '../core/logger.js';
import type { Scheduler } from '../core/scheduler.js';
import type { Session } from '../core/session.js';

export type AppContext = {
  configStore: ConfigStore;
  session: Session;
  scheduler: Scheduler;
  logger: Logger;
  getAdapter: () => AutomationAdapter;
};

function zodMsg(err: z.ZodError): string {
  return err.issues
    .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
    .join('; ');
}

function publicConfig(config: AppConfig) {
  const { lanToken: _ignored, ...rest } = config;
  return rest;
}

export function registerRoutes(app: Express, ctx: AppContext): void {
  const { configStore, session, scheduler, logger, getAdapter } = ctx;
  const router = Router();

  function statePayload() {
    return {
      status: session.status,
      stats: session.snapshot(),
      config: publicConfig(configStore.get()),
      adapter: getAdapter().name,
    };
  }

  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  router.get('/state', (_req, res) => {
    res.json(statePayload());
  });

  router.post('/session/start', async (req, res) => {
    const parsed = startSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: zodMsg(parsed.error) });
      return;
    }
    try {
      await scheduler.start(parsed.data);
      res.status(202).json({ ok: true });
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  router.post('/session/stop', async (req, res) => {
    const parsed = stopSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: zodMsg(parsed.error) });
      return;
    }
    await scheduler.stop(parsed.data.mode);
    res.json({ ok: true });
  });

  router.get('/config', (_req, res) => {
    res.json(publicConfig(configStore.get()));
  });

  router.put('/config', (req, res) => {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: zodMsg(parsed.error) });
      return;
    }
    try {
      const updated = configStore.update(parsed.data);
      res.json(publicConfig(updated));
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  router.get('/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const send = (payload: unknown) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    send({ type: 'state', state: statePayload() });
    for (const entry of logger.recent()) {
      send({ type: 'log', entry });
    }

    const onLog = (entry: LogEntry) => send({ type: 'log', entry });
    const onState = () => send({ type: 'state', state: statePayload() });
    logger.on('log', onLog);
    session.on('update', onState);
    const heartbeat = setInterval(() => {
      res.write(': hb\n\n');
    }, 25_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      logger.off('log', onLog);
      session.off('update', onState);
    });
  });

  router.post('/probe', async (_req, res) => {
    const adapter = getAdapter();
    try {
      const available = await adapter.isAvailable();
      if (!available) {
        res.status(503).json({
          ok: false,
          adapter: adapter.name,
          reason: 'adapter tidak tersedia / device belum terhubung',
        });
        return;
      }
      const foreground = await adapter.checkForeground();
      const visible = adapter.checkVisible
        ? await adapter.checkVisible()
        : foreground;
      let composerId: string | null = null;
      let dumpOk = false;
      if (adapter.dumpUi) {
        try {
          const xml = await adapter.dumpUi();
          dumpOk = true;
          composerId = parseComposerId(xml);
          if (composerId) {
            const current = configStore.get();
            configStore.update({
              ...current,
              selectors: { ...current.selectors, composerId },
            });
            logger.info(`probe: composerId tersimpan = ${composerId}`);
          } else {
            logger.warn('probe: composer tidak terdeteksi — pakai blind send');
          }
        } catch (e) {
          logger.warn(`probe: uiautomator dump gagal: ${e}`);
        }
      }
      res.json({
        ok: true,
        adapter: adapter.name,
        foreground,
        visible,
        dumpOk,
        composerId,
        hint: foreground
          ? 'Discord focus input — siap Start'
          : visible
            ? 'Discord terlihat (split-screen/floating) — Start, lalu tap Discord dalam 10 dtk'
            : 'Buka Discord di channel OwO target lalu Start',
      });
    } catch (e) {
      res.status(500).json({
        ok: false,
        adapter: adapter.name,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.use('/api', router);
}
