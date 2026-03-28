import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import compression from 'compression';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import ffmpegPath from 'ffmpeg-static';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import ytdl from '@distube/ytdl-core';
import { getYoutubeInfo, getYtdlVideoInfo, isYoutubeCookieInlineConfigured, startYoutubeDownload } from './youtube-node.js';

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';
const VIDEO_INFO_CACHE_TTL_MS = 3 * 60 * 1000;
const VIDEO_INFO_CACHE_MAX_ENTRIES = 300;
const DOWNLOAD_PROGRESS_TTL_MS = 10 * 60 * 1000;

const logErr = (...args: unknown[]) => console.error('[vibedown-api]', ...args);
const videoInfoCache = new Map<string, { expiresAt: number; payload: unknown }>();
const downloadProgress = new Map<
  string,
  {
    state: 'preparing' | 'downloading' | 'completed' | 'failed';
    percent?: number;
    speed?: string;
    eta?: string;
    error?: string;
    updatedAt: number;
  }
>();

function parseFormatId(q: unknown): string {
  if (typeof q === 'string' && q.length > 0) return q;
  if (Array.isArray(q) && typeof q[0] === 'string' && q[0].length > 0) return q[0];
  return 'best';
}

function parseDownloadKind(q: unknown): 'video' | 'mp3' {
  if (typeof q === 'string' && q.toLowerCase() === 'mp3') return 'mp3';
  if (Array.isArray(q) && typeof q[0] === 'string' && q[0].toLowerCase() === 'mp3') return 'mp3';
  return 'video';
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeVideoUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase();

    // Remove noisy YouTube share-tracking params that can break extraction.
    parsed.searchParams.delete('si');

    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\/+/, '').split('/')[0];
      if (id) return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    }

    if (host.endsWith('youtube.com')) {
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/?#]+)/i);
      if (shortsMatch?.[1]) {
        return `https://www.youtube.com/watch?v=${encodeURIComponent(shortsMatch[1])}`;
      }
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  const err = error as { stderr?: string; message?: string };
  if (err?.stderr) {
    const stderr = String(err.stderr);
    if (stderr.includes('ERROR:')) {
      return stderr.split('ERROR:')[1].split(/\r?\n/)[0].trim();
    }
  }
  if (err?.message) return err.message;
  return fallback;
}

function sanitizeFilenamePart(input: string, fallback: string): string {
  const cleaned = input
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
}

function toAsciiFilename(input: string, fallback: string): string {
  const ascii = input
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return ascii || fallback;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (i + 1)));
      }
    }
  }
  throw lastError;
}

function cleanupVideoInfoCache(): void {
  const now = Date.now();
  for (const [key, value] of videoInfoCache.entries()) {
    if (value.expiresAt <= now) videoInfoCache.delete(key);
  }
  if (videoInfoCache.size <= VIDEO_INFO_CACHE_MAX_ENTRIES) return;
  const overflow = videoInfoCache.size - VIDEO_INFO_CACHE_MAX_ENTRIES;
  const keys = [...videoInfoCache.keys()].slice(0, overflow);
  for (const key of keys) videoInfoCache.delete(key);
}

function cleanupDownloadProgress(): void {
  const minTime = Date.now() - DOWNLOAD_PROGRESS_TTL_MS;
  for (const [id, info] of downloadProgress.entries()) {
    if (info.updatedAt < minTime) downloadProgress.delete(id);
  }
}

function parseProgressLine(line: string): { percent?: number; speed?: string; eta?: string } | null {
  const percentMatch = line.match(/(\d+(?:\.\d+)?)%/);
  const etaMatch = line.match(/ETA\s+([0-9:]+)/i);
  const speedMatch = line.match(/at\s+([^\s]+\/s)/i);
  if (!percentMatch && !etaMatch && !speedMatch) return null;
  return {
    percent: percentMatch ? Math.min(100, Math.max(0, Math.round(Number(percentMatch[1])))) : undefined,
    speed: speedMatch?.[1],
    eta: etaMatch?.[1],
  };
}

export function createApp(): express.Express {
  const app = express();

  if (IS_PROD) {
    app.set('trust proxy', 1);
  }

  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );
  app.use(
    compression({
      // Never compress binary download streams (breaks browsers / proxies).
      filter: (req, res) => {
        if (req.url?.startsWith('/api/download')) return false;
        return compression.filter(req, res);
      },
    })
  );
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '200kb' }));
  app.use(morgan(IS_PROD ? 'combined' : 'dev'));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/', limiter);

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      env: NODE_ENV,
      youtubeEngine: 'ytdl-core',
      ytdlCoreVersion: ytdl.version,
      hasYoutubeCookie: isYoutubeCookieInlineConfigured(),
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/video-info', async (req, res) => {
    try {
      const url = normalizeVideoUrl(String(req.body?.url || ''));
      if (!url) return res.status(400).json({ error: 'URL is required' });
      if (!isHttpUrl(url)) return res.status(400).json({ error: 'URL must be a valid http(s) link.' });
      if (!ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Only YouTube links are supported.' });
      }

      cleanupVideoInfoCache();
      const cached = videoInfoCache.get(url);
      if (cached && cached.expiresAt > Date.now()) {
        return res.json(cached.payload);
      }

      const payload = await withRetry(() => getYoutubeInfo(url), 2);

      videoInfoCache.set(url, {
        expiresAt: Date.now() + VIDEO_INFO_CACHE_TTL_MS,
        payload,
      });
      return res.json(payload);
    } catch (error) {
      const message = normalizeErrorMessage(error, 'Failed to fetch video info.');
      logErr('video-info failed:', message);
      if (/sign in|not a bot|bot gate|no playable formats|failed to find any playable|login required|captcha/i.test(message)) {
        return res.status(503).json({
          error: message,
          code: 'YOUTUBE_BOT_GATE',
          hint:
            'YouTube is limiting requests from this server. Try another video or time; for stubborn links set INLINE_YOUTUBE_COOKIE in server/youtube-node.ts (private fork only — never put a real Google cookie in a public GitHub repo).',
        });
      }
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/download', async (req, res) => {
    cleanupDownloadProgress();
    const url = typeof req.query.url === 'string' ? normalizeVideoUrl(req.query.url) : '';
    if (!url) return res.status(400).json({ error: 'URL is required' });
    if (!isHttpUrl(url)) return res.status(400).json({ error: 'URL must be a valid http(s) link.' });

    const fmtId = parseFormatId(req.query.format_id);
    const requestId = typeof req.query.request_id === 'string' ? req.query.request_id : '';
    const downloadKind = parseDownloadKind(req.query.kind);
    const isMp3 = fmtId.toLowerCase() === 'mp3' || downloadKind === 'mp3';

    try {
      if (!ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Only YouTube links are supported.' });
      }
      if (requestId) {
        downloadProgress.set(requestId, { state: 'preparing', updatedAt: Date.now() });
      }

      const info = await withRetry(() => getYtdlVideoInfo(url), 2);

      let handle;
      try {
        handle = startYoutubeDownload(info, fmtId, downloadKind);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Download failed.';
        return res.status(400).json({ error: msg });
      }

      const inputStream = handle.stream;
      let ffmpegMp3: ChildProcessWithoutNullStreams | null = null;
      let outputStream = inputStream;

      if (isMp3) {
        const ffmpegExec = ffmpegPath || 'ffmpeg';
        ffmpegMp3 = spawn(
          ffmpegExec,
          ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-vn', '-acodec', 'libmp3lame', '-q:a', '2', '-f', 'mp3', 'pipe:1'],
          { stdio: ['pipe', 'pipe', 'pipe'] }
        );
        inputStream.pipe(ffmpegMp3.stdin);
        outputStream = ffmpegMp3.stdout;
      }

      const titlePart = sanitizeFilenamePart(typeof req.query.title === 'string' ? req.query.title : '', 'vibedown');
      const asciiTitlePart = toAsciiFilename(titlePart, 'vibedown');
      const outputExt = isMp3 ? 'mp3' : 'mp4';
      const fileLabel = fmtId === 'best' ? 'best' : fmtId;
      const safeFile = `${asciiTitlePart}-${fileLabel}.${outputExt}`;
      const encodedFile = `${encodeURIComponent(`${titlePart}-${fileLabel}.${outputExt}`)}`;

      const killProc = () => {
        handle.kill();
        try {
          ffmpegMp3?.kill('SIGKILL');
        } catch {
          /* ignore */
        }
      };

      let responseSettled = false;
      let streamStarted = false;

      const sendJsonError = (message: string) => {
        if (responseSettled || res.headersSent || res.writableEnded) return;
        responseSettled = true;
        killProc();
        res.status(500).json({ error: message });
      };

      res.once('close', killProc);

      const onFfmpegStderr = (chunk: Buffer) => {
        const line = chunk.toString();
        if (requestId) {
          const parsed = parseProgressLine(line);
          if (parsed) {
            downloadProgress.set(requestId, {
              state: 'downloading',
              percent: parsed.percent,
              speed: parsed.speed,
              eta: parsed.eta,
              updatedAt: Date.now(),
            });
          }
        }
        if (line.trim()) logErr('ffmpeg stderr:', line.trim());
      };

      handle.ffmpegProc?.stderr?.on('data', onFfmpegStderr);
      ffmpegMp3?.stderr.on('data', onFfmpegStderr);

      const onDrain = () => outputStream.resume();
      res.on('drain', onDrain);

      inputStream.on('error', (err: Error) => {
        res.removeListener('drain', onDrain);
        if (!streamStarted) {
          if (requestId) {
            downloadProgress.set(requestId, {
              state: 'failed',
              error: err.message || 'Download stream failed',
              updatedAt: Date.now(),
            });
          }
          sendJsonError(err.message || 'Download stream failed');
        }
      });

      const beginBody = () => {
        if (streamStarted) return;
        streamStarted = true;
        if (requestId) {
          downloadProgress.set(requestId, {
            state: 'downloading',
            percent: 1,
            updatedAt: Date.now(),
          });
        }
        res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFile}"; filename*=UTF-8''${encodedFile}`);
        res.setHeader('Cache-Control', 'no-store');
      };

      outputStream.on('data', (chunk: Buffer) => {
        beginBody();
        const ok = res.write(chunk);
        if (!ok) outputStream.pause();
      });

      outputStream.on('end', () => {
        res.removeListener('drain', onDrain);
        if (requestId) {
          downloadProgress.set(requestId, {
            state: 'completed',
            percent: 100,
            updatedAt: Date.now(),
          });
        }
        if (streamStarted && !res.writableEnded) res.end();
      });

      outputStream.on('error', (err: Error) => {
        res.removeListener('drain', onDrain);
        if (!streamStarted) {
          if (requestId) {
            downloadProgress.set(requestId, {
              state: 'failed',
              error: err.message || 'Stream read failed',
              updatedAt: Date.now(),
            });
          }
          sendJsonError(err.message || 'Stream read failed');
        } else if (!res.writableEnded) {
          responseSettled = true;
          killProc();
          res.destroy();
        }
      });

      ffmpegMp3?.on('error', (err: NodeJS.ErrnoException) => {
        res.removeListener('close', killProc);
        res.removeListener('drain', onDrain);
        if (err.code === 'ENOENT') {
          sendJsonError('MP3 conversion requires ffmpeg. Install ffmpeg and add it to PATH.');
          if (requestId) {
            downloadProgress.set(requestId, {
              state: 'failed',
              error: 'MP3 conversion requires ffmpeg.',
              updatedAt: Date.now(),
            });
          }
          return;
        }
        sendJsonError(err.message || 'Failed to spawn ffmpeg');
      });

      handle.ffmpegProc?.on('error', (err: Error) => {
        res.removeListener('drain', onDrain);
        sendJsonError(err.message || 'Video merge failed to start.');
      });

      handle.ffmpegProc?.on('close', (code: number | null) => {
        res.removeListener('drain', onDrain);
        if (!streamStarted && code !== 0 && code !== null) {
          if (requestId) {
            downloadProgress.set(requestId, {
              state: 'failed',
              error: 'Video merge failed',
              updatedAt: Date.now(),
            });
          }
          sendJsonError('Video merge failed. Try another quality or format.');
        }
      });

      ffmpegMp3?.on('close', (code: number | null) => {
        res.removeListener('drain', onDrain);
        if (!streamStarted && code !== 0 && code !== null) {
          if (requestId) {
            downloadProgress.set(requestId, {
              state: 'failed',
              error: 'MP3 conversion failed',
              updatedAt: Date.now(),
            });
          }
          sendJsonError('MP3 conversion failed.');
        }
      });
    } catch (error) {
      const message = normalizeErrorMessage(error, 'Failed to start download');
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/download-status', (req, res) => {
    cleanupDownloadProgress();
    const id = typeof req.query.request_id === 'string' ? req.query.request_id : '';
    if (!id) return res.status(400).json({ error: 'request_id is required' });
    const status = downloadProgress.get(id);
    if (!status) return res.json({ state: 'preparing' });
    return res.json(status);
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = IS_PROD ? 'Internal server error' : normalizeErrorMessage(err, 'Internal server error');
    logErr('Unhandled error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  });

  return app;
}
