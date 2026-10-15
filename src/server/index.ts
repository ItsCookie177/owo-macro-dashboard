import express from 'express';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerRoutes } from './api/routes.js';
import { detectAdapter, setAdapter } from './adapters/detect.js';
import { ConfigStore } from './core/config.js';
import { Logger } from './core/logger.js';
import { PresetStore } from './core/presets.js';
import { Scheduler } from './core/scheduler.js';
import { Session } from './core/session.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, '../../dist');
const indexHtml = path.join(distDir, 'index.html');

const configStore = new ConfigStore();
const presets = new PresetStore();
const logger = new Logger();
const session = new Session();
const adapter = await detectAdapter();
setAdapter(adapter);
const scheduler = new Scheduler({ adapter, configStore, session, logger });

logger.on('log', (entry) => {
  console.log(`[${entry.level}] ${entry.ts} ${entry.msg}`);
});

const app = express();
app.use(express.json());

function isLocal(req: express.Request): boolean {
  const ip = req.socket.remoteAddress ?? '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

app.use('/api', (req, res, next) => {
  if (isLocal(req)) return next();
  const token = req.query.token ?? req.get('x-token');
  if (
    typeof token === 'string' &&
    token === configStore.get().lanToken
  ) {
    return next();
  }
  res.status(401).json({ error: 'token wajib untuk akses dari LAN' });
});

registerRoutes(app, { configStore, presets, session, scheduler, logger, getAdapter: () => adapter });

app.use(express.static(distDir));

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(indexHtml);
    return;
  }
  next();
});

function lanUrls(port: number, token: string): string[] {
  const urls: string[] = [];
  for (const infos of Object.values(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family === 'IPv4' && !info.internal) {
        urls.push(`http://${info.address}:${port}/?token=${token}`);
      }
    }
  }
  return urls;
}

async function shutdown(signal: string): Promise<void> {
  console.log(`[server] ${signal} — berhenti`);
  try {
    await scheduler.stop('emergency');
  } catch {
    /* abaikan */
  }
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

app.listen(PORT, HOST, () => {
  console.log(`[server] jalan di http://127.0.0.1:${PORT} (adapter: ${adapter.name})`);
  for (const url of lanUrls(PORT, configStore.get().lanToken)) {
    console.log(`[server] akses PC: ${url}`);
  }
});
