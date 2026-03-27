import { createApp } from '../../server/app.js';

const app = createApp();
const PORT = Number(process.env.PORT) || 3001;

const log = (...args: unknown[]) => console.log('[vibedown-api]', ...args);
const logErr = (...args: unknown[]) => console.error('[vibedown-api]', ...args);

const server = app.listen(PORT, '0.0.0.0', () => {
  log(`listening on http://127.0.0.1:${PORT}`);
  log('health endpoint: GET /api/health (YouTube engine: Node.js / ytdl-core)');
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logErr(`Port ${PORT} is already in use. Set PORT in env.`);
    process.exit(1);
  }
  throw err;
});

const gracefulShutdown = (signal: string) => {
  log(`received ${signal}, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
