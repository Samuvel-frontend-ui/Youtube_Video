import { spawn, type ChildProcess } from 'child_process';
import type { Readable } from 'stream';
import ytdl from '@distube/ytdl-core';
import ffmpegPath from 'ffmpeg-static';

type YtdlVideoInfo = Awaited<ReturnType<typeof ytdl.getInfo>>;
type YtdlFormat = YtdlVideoInfo['formats'][number];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const INFO_OPTS = { playerClients: ['ANDROID', 'WEB'] as ('ANDROID' | 'WEB')[] };

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatHeight(f: YtdlFormat): number {
  if (typeof f.height === 'number' && f.height > 0) return f.height;
  const m = /^(\d{3,4})p/.exec(String(f.qualityLabel || ''));
  return m ? Number(m[1]) : 0;
}

export async function getYoutubeInfo(url: string): Promise<{
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  duration_string: string;
  uploader: string;
  formats: Array<{
    format_id: string;
    ext: string;
    resolution: string;
    filesize?: number;
    quality: string;
    format_type: 'video+audio' | 'video-only' | 'audio-only';
  }>;
}> {
  const info = await ytdl.getInfo(url, INFO_OPTS);
  const d = info.videoDetails;
  const formats = info.formats;

  const progressive = ytdl
    .filterFormats(formats, 'videoandaudio')
    .filter((f) => (f.container === 'mp4' || f.container === 'webm') && f.url);

  const videoFormats = progressive
    .map((f) => {
      const h = formatHeight(f);
      return {
        format_id: String(f.itag),
        ext: f.container === 'webm' ? 'webm' : 'mp4',
        resolution: f.qualityLabel || (h ? `${h}p` : ''),
        filesize: f.contentLength ? Number(f.contentLength) : undefined,
        quality: String(f.qualityLabel || (h ? `${h}p` : 'Unknown')),
        format_type: 'video+audio' as const,
        height: h,
      };
    })
    .filter((f) => f.format_id && f.quality)
    .sort((a, b) => b.height - a.height || a.format_id.localeCompare(b.format_id));

  const maxHeight = videoFormats.reduce((max, f) => (f.height > max ? f.height : max), 0);
  const maxFromAll = Math.max(
    maxHeight,
    ...ytdl.filterFormats(formats, 'videoonly').map((f) => formatHeight(f))
  );
  const presetHeights = [360, 480, 720, 1080].filter((h) => h <= Math.max(maxFromAll, 360));
  const presetFormats = presetHeights.map((h) => ({
    format_id: `q-${h}p`,
    ext: 'mp4',
    resolution: `${h}p`,
    filesize: undefined,
    quality: `${h}p (recommended)`,
    format_type: 'video+audio' as const,
  }));

  const listFormats = [
    {
      format_id: 'mp3',
      ext: 'mp3',
      resolution: 'audio',
      filesize: undefined,
      quality: 'MP3 (audio only)',
      format_type: 'audio-only' as const,
    },
    ...presetFormats,
    ...videoFormats.map(({ height: _h, ...rest }) => rest),
  ];

  const thumbs = d.thumbnails || [];
  const thumb = thumbs.length ? thumbs[thumbs.length - 1].url : '';

  return {
    id: d.videoId || '',
    title: d.title || 'Untitled',
    thumbnail: thumb,
    duration: Number(d.lengthSeconds || 0),
    duration_string: formatDuration(Number(d.lengthSeconds || 0)),
    uploader: d.author?.name || 'Unknown',
    formats: listFormats,
  };
}

function pickProgressiveUnderHeight(formats: YtdlFormat[], maxHeight: number): YtdlFormat | undefined {
  const candidates = ytdl
    .filterFormats(formats, 'videoandaudio')
    .filter((f) => f.url && (f.container === 'mp4' || f.container === 'webm'))
    .map((f) => ({ f, h: formatHeight(f) }))
    .filter(({ h }) => h > 0 && h <= maxHeight)
    .sort((a, b) => b.h - a.h);
  return candidates[0]?.f;
}

function pickVideoOnlyUnderHeight(formats: YtdlFormat[], maxHeight: number): YtdlFormat | undefined {
  const candidates = ytdl
    .filterFormats(formats, 'videoonly')
    .filter((f) => f.url && (f.container === 'mp4' || f.container === 'webm'))
    .map((f) => ({ f, h: formatHeight(f) }))
    .filter(({ h }) => h > 0 && h <= maxHeight)
    .sort((a, b) => b.h - a.h);
  return candidates[0]?.f;
}

function pickBestAudio(formats: YtdlFormat[]): YtdlFormat | undefined {
  const audios = ytdl.filterFormats(formats, 'audioonly').filter((f) => f.url);
  if (!audios.length) return undefined;
  return audios.sort((a, b) => (Number(b.audioBitrate || 0) || 0) - (Number(a.audioBitrate || 0) || 0))[0];
}

function spawnFfmpegMerge(videoUrl: string, audioUrl: string): {
  proc: ChildProcess;
  stdout: Readable;
} {
  const ff = ffmpegPath || 'ffmpeg';
  const proc = spawn(
    ff,
    [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-user_agent',
      UA,
      '-referer',
      'https://www.youtube.com/',
      '-i',
      videoUrl,
      '-user_agent',
      UA,
      '-referer',
      'https://www.youtube.com/',
      '-i',
      audioUrl,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-shortest',
      '-movflags',
      'frag_keyframe+empty_moov',
      '-f',
      'mp4',
      'pipe:1',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  return { proc, stdout: proc.stdout };
}

export type YoutubeDownloadHandle = {
  stream: Readable;
  kill: () => void;
  ffmpegProc?: ChildProcess;
};

export function startYoutubeDownload(info: YtdlVideoInfo, formatId: string, kind: 'video' | 'mp3'): YoutubeDownloadHandle {
  const formats = info.formats;
  const isMp3 = formatId.toLowerCase() === 'mp3' || kind === 'mp3';

  if (isMp3) {
    const stream = ytdl.downloadFromInfo(info, {
      quality: 'highestaudio',
      filter: 'audioonly',
      requestOptions: { headers: { 'user-agent': UA, referer: 'https://www.youtube.com/' } },
    });
    return {
      stream,
      kill: () => {
        stream.destroy();
      },
    };
  }

  const presetMatch = /^q-(\d{3,4})p$/i.exec(formatId.trim());
  if (presetMatch) {
    const maxH = Number(presetMatch[1]);
    const prog = pickProgressiveUnderHeight(formats, maxH);
    if (prog) {
      const stream = ytdl.downloadFromInfo(info, {
        format: prog,
        requestOptions: { headers: { 'user-agent': UA, referer: 'https://www.youtube.com/' } },
      });
      return {
        stream,
        kill: () => stream.destroy(),
      };
    }
    const v = pickVideoOnlyUnderHeight(formats, maxH);
    const a = pickBestAudio(formats);
    if (!v || !a?.url) {
      throw new Error(`No playable format up to ${maxH}p for this video.`);
    }
    const { proc, stdout } = spawnFfmpegMerge(v.url, a.url);
    return {
      stream: stdout,
      ffmpegProc: proc,
      kill: () => {
        try {
          proc.kill('SIGKILL');
        } catch {
          /* ignore */
        }
      },
    };
  }

  if (formatId === 'best') {
    const prog = ytdl
      .filterFormats(formats, 'videoandaudio')
      .filter((f) => f.url && (f.container === 'mp4' || f.container === 'webm'))
      .sort((a, b) => formatHeight(b) - formatHeight(a))[0];
    if (prog) {
      const stream = ytdl.downloadFromInfo(info, {
        format: prog,
        requestOptions: { headers: { 'user-agent': UA, referer: 'https://www.youtube.com/' } },
      });
      return { stream, kill: () => stream.destroy() };
    }
    const v = pickVideoOnlyUnderHeight(formats, 2160);
    const a = pickBestAudio(formats);
    if (!v || !a?.url) throw new Error('No playable combined format found.');
    const { proc, stdout } = spawnFfmpegMerge(v.url, a.url);
    return {
      stream: stdout,
      ffmpegProc: proc,
      kill: () => {
        try {
          proc.kill('SIGKILL');
        } catch {
          /* ignore */
        }
      },
    };
  }

  const itag = Number(formatId);
  if (!Number.isFinite(itag)) {
    throw new Error('Invalid format selection.');
  }
  const fmt = formats.find((f) => f.itag === itag);
  if (!fmt || !fmt.url) {
    throw new Error('Selected format is not available.');
  }
  if (fmt.hasVideo && fmt.hasAudio) {
    const stream = ytdl.downloadFromInfo(info, {
      format: fmt,
      requestOptions: { headers: { 'user-agent': UA, referer: 'https://www.youtube.com/' } },
    });
    return { stream, kill: () => stream.destroy() };
  }
  if (fmt.hasVideo && !fmt.hasAudio) {
    const a = pickBestAudio(formats);
    if (!a?.url) throw new Error('No audio stream to merge with this video format.');
    const { proc, stdout } = spawnFfmpegMerge(fmt.url, a.url);
    return {
      stream: stdout,
      ffmpegProc: proc,
      kill: () => {
        try {
          proc.kill('SIGKILL');
        } catch {
          /* ignore */
        }
      },
    };
  }
  throw new Error('This format cannot be downloaded as video.');
}
