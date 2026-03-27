import { motion } from 'motion/react';
import { Download, FileVideo, HardDrive, Music } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DownloadProgress, VideoFormat, videoService } from '../services/api';
import { formatBytes } from '../lib/utils';

interface FormatListProps {
  formats: VideoFormat[];
  onDownload: (formatId: string, kind: 'video' | 'mp3', requestId: string) => Promise<void>;
  onDownloadStarted?: () => void;
}

export default function FormatList({ formats, onDownload, onDownloadStarted }: FormatListProps) {
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const [activeTab, setActiveTab] = useState<'recommended' | 'video' | 'audio'>('recommended');
  const [status, setStatus] = useState<'idle' | 'preparing' | 'downloading' | 'completed' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const selectedKind = useMemo<'video' | 'mp3'>(() => {
    if (!selectedFormat) return 'video';
    return selectedFormat.ext === 'mp3' ? 'mp3' : 'video';
  }, [selectedFormat]);

  const openPopup = (format: VideoFormat) => {
    setSelectedFormat(format);
    setStatus('idle');
    setStatusMessage('');
    setIsSubmitting(false);
  };

  const closePopup = () => {
    setSelectedFormat(null);
    setStatus('idle');
    setStatusMessage('');
    setProgress(null);
    setRequestId(null);
    setIsSubmitting(false);
  };

  const handleConfirmDownload = async () => {
    if (!selectedFormat) return;
    const nextRequestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setIsSubmitting(true);
    setStatus('preparing');
    setStatusMessage('Preparing your download...');
    try {
      setRequestId(nextRequestId);
      await onDownload(selectedFormat.format_id, selectedKind, nextRequestId);
      onDownloadStarted?.();
    } catch (error) {
      setStatus('failed');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to start download.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!requestId || status === 'completed' || status === 'failed') return;

    const timer = window.setInterval(async () => {
      try {
        const next = await videoService.fetchDownloadStatus(requestId);
        setProgress(next);
        if (next.state === 'preparing') {
          setStatus('preparing');
          setStatusMessage('Preparing your download...');
          return;
        }
        if (next.state === 'downloading') {
          setStatus('downloading');
          setStatusMessage(`Downloading ${next.percent != null ? `${next.percent}%` : ''}`);
          return;
        }
        if (next.state === 'completed') {
          setStatus('completed');
          setStatusMessage('Download completed.');
          window.clearInterval(timer);
          return;
        }
        if (next.state === 'failed') {
          setStatus('failed');
          setStatusMessage(next.error || 'Download failed.');
          window.clearInterval(timer);
        }
      } catch {
        // keep polling silently
      }
    }, 1200);

    return () => window.clearInterval(timer);
  }, [requestId, status]);

  const visibleFormats = useMemo(() => {
    if (activeTab === 'audio') return formats.filter((f) => f.ext === 'mp3' || f.format_type === 'audio-only');
    if (activeTab === 'video') return formats.filter((f) => f.ext !== 'mp3');
    return formats.filter((f) => f.quality.toLowerCase().includes('recommended') || f.ext === 'mp3').slice(0, 8);
  }, [activeTab, formats]);

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2">
        <button className={`btn-secondary py-1.5 px-4 text-sm ${activeTab === 'recommended' ? 'ring-2 ring-purple-500/50' : ''}`} onClick={() => setActiveTab('recommended')} type="button">Recommended</button>
        <button className={`btn-secondary py-1.5 px-4 text-sm ${activeTab === 'video' ? 'ring-2 ring-purple-500/50' : ''}`} onClick={() => setActiveTab('video')} type="button">Video</button>
        <button className={`btn-secondary py-1.5 px-4 text-sm ${activeTab === 'audio' ? 'ring-2 ring-purple-500/50' : ''}`} onClick={() => setActiveTab('audio')} type="button">Audio</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {visibleFormats.map((format, index) => (
          <motion.div
            key={`${format.format_id}-${format.ext}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
            className="glass-card p-4 transition-all group hover:-translate-y-0.5 hover:shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center transition-all dark:bg-purple-500/10 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white">
                  {format.ext === 'mp3' ? <Music className="w-5 h-5" /> : <FileVideo className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{format.quality}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {format.ext} {format.format_type ? `- ${format.format_type}` : ''}
                  </div>
                </div>
              </div>

              {format.filesize && (
                <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                  <HardDrive className="w-3 h-3" />
                  {formatBytes(format.filesize)}
                </div>
              )}
            </div>

            <button
              onClick={() => openPopup(format)}
              className="w-full btn-secondary py-2 flex items-center justify-center gap-2 text-sm group-hover:bg-purple-600 group-hover:text-white dark:group-hover:bg-purple-600"
            >
              <Download className="w-4 h-4" />
              {format.ext === 'mp3' ? 'Download MP3' : 'Download'}
            </button>
          </motion.div>
        ))}
      </div>

      {selectedFormat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/45 dark:bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Confirm Download</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-2">
              Quality: <span className="font-semibold text-slate-900 dark:text-white">{selectedFormat.quality}</span>
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Type: {selectedKind === 'mp3' ? 'MP3 audio' : 'Video'} ({selectedFormat.ext.toUpperCase()})
            </p>
            {selectedFormat.filesize && (
              <p className="text-slate-600 dark:text-slate-400 text-sm">Estimated size: {formatBytes(selectedFormat.filesize)}</p>
            )}

            {status !== 'idle' && (
              <div
                aria-live="polite"
                className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                  status === 'failed'
                    ? 'border-red-400/40 bg-red-500/10 text-red-300'
                    : status === 'completed'
                      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-purple-400/40 bg-purple-500/10 text-purple-200'
                }`}
              >
                {statusMessage}
                {status === 'downloading' && (
                  <div className="mt-2 space-y-1">
                    <div className="h-2 rounded bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-purple-400 transition-all"
                        style={{ width: `${Math.min(Math.max(progress?.percent ?? 0, 2), 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>{progress?.speed || 'speed -'}</span>
                      <span>{progress?.eta || 'ETA -'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={closePopup}
                className="flex-1 btn-secondary py-2"
                disabled={isSubmitting}
              >
                {status === 'completed' ? 'Done' : 'Close'}
              </button>
              <button
                onClick={handleConfirmDownload}
                className="flex-1 btn-primary py-2"
                disabled={isSubmitting || status === 'downloading'}
              >
                {isSubmitting ? 'Starting...' : status === 'downloading' ? 'Downloading...' : 'Download Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
