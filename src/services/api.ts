import axios, { AxiosError } from 'axios';

const apiOrigin = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const apiBase = apiOrigin ? `${apiOrigin}/api` : '/api';

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  filesize?: number;
  quality: string;
  format_type?: 'video+audio' | 'video-only' | 'audio-only';
}

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  duration_string: string;
  uploader: string;
  formats: VideoFormat[];
}

export interface DownloadProgress {
  state: 'preparing' | 'downloading' | 'completed' | 'failed';
  percent?: number;
  speed?: string;
  eta?: string;
  error?: string;
}

const api = axios.create({
  baseURL: apiBase,
  timeout: 120_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ error?: string }>;
  const responseData = axiosError.response?.data as unknown;
  if (typeof responseData === 'string' && responseData.trim()) return responseData;
  if (responseData && typeof responseData === 'object') {
    const dataObj = responseData as { error?: unknown; message?: unknown; hint?: unknown };
    const hint = typeof dataObj.hint === 'string' && dataObj.hint.trim() ? ` ${dataObj.hint.trim()}` : '';
    if (typeof dataObj.error === 'string' && dataObj.error.trim()) return `${dataObj.error.trim()}${hint}`;
    if (typeof dataObj.message === 'string' && dataObj.message.trim()) return `${dataObj.message.trim()}${hint}`;
  }
  if (axiosError.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ECONNREFUSED')
    return 'Cannot reach the API. Run the stack with npm run dev (starts Vite + Python API), or set VITE_API_URL to your deployed API URL.';
  if (axiosError.code === 'ECONNRESET' || /ECONNRESET/i.test(String(axiosError.message)))
    return 'Connection was reset while talking to the API. Retry the search, or restart dev servers (npm run dev) if the API restarted mid-request.';
  if (axiosError.message) return axiosError.message;
  return fallback;
}

export const videoService = {
  async fetchInfo(url: string): Promise<VideoInfo> {
    if (!url?.trim()) {
      throw new Error('URL is required');
    }

    try {
      const response = await api.post<VideoInfo>('/video-info', { url: url.trim() });
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to fetch video info'));
    }
  },

  getDownloadUrl(url: string, formatId: string, opts?: { title?: string; kind?: 'video' | 'mp3'; requestId?: string }): string {
    const trimmedUrl = url?.trim();
    const trimmedFormat = formatId?.trim();

    if (!trimmedUrl) throw new Error('URL is required');
    if (!trimmedFormat) throw new Error('Format is required');

    const params = new URLSearchParams({
      url: trimmedUrl,
      format_id: trimmedFormat,
    });
    if (opts?.title?.trim()) params.set('title', opts.title.trim());
    if (opts?.kind) params.set('kind', opts.kind);
    if (opts?.requestId) params.set('request_id', opts.requestId);
    return `${apiBase}/download?${params.toString()}`;
  },

  async fetchDownloadStatus(requestId: string): Promise<DownloadProgress> {
    const response = await api.get<DownloadProgress>('/download-status', { params: { request_id: requestId } });
    return response.data;
  },
};
