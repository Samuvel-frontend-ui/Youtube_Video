import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SearchBox from '../components/SearchBox';
import VideoCard from '../components/VideoCard';
import FormatList from '../components/FormatList';
import Skeleton from '../components/Skeleton';
import HistoryList from '../components/HistoryList';
import { videoService, VideoInfo } from '../services/api';
import { useDownloadHistory } from '../hooks/useDownloadHistory';
import { AlertCircle } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

export default function Home() {
  const canonicalUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://vibedown.vercel.app/';
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'VibeDown',
    url: canonicalUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${canonicalUrl}?url={videoUrl}`,
      'query-input': 'required name=videoUrl',
    },
  };
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'VibeDown',
    url: canonicalUrl,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'samuve240904@gmail.com',
      telephone: '+91-9789419084',
    },
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Why does some video not show 1080p?',
        acceptedAnswer: { '@type': 'Answer', text: 'Some uploads are only available in lower source resolutions.' },
      },
      {
        '@type': 'Question',
        name: 'Can I download YouTube Shorts as MP3?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes. Paste Shorts link, fetch formats, then choose MP3 in audio tab.' },
      },
      {
        '@type': 'Question',
        name: 'Why does a format fail to download sometimes?',
        acceptedAnswer: { '@type': 'Answer', text: 'Some formats are restricted or unstable from source delivery; try recommended formats.' },
      },
    ],
  };
  const pageSchemas = useMemo(() => [websiteSchema, organizationSchema, faqSchema], [canonicalUrl]);

  const [isLoading, setIsLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [clearSignal, setClearSignal] = useState(0);
  const { history, addToHistory, clearHistory } = useDownloadHistory();

  useEffect(() => {
    trackEvent('page_view', { page: 'home' });
  }, []);

  const handleSearch = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setVideoInfo(null);
    setCurrentUrl(url);

    try {
      const info = await videoService.fetchInfo(url);
      trackEvent('fetch_video_info', { success: true });
      setVideoInfo(info);
      addToHistory({
        id: info.id,
        title: info.title,
        thumbnail: info.thumbnail,
        url: url
      });
    } catch (err: unknown) {
      trackEvent('fetch_video_info_failed', { success: false });
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'response' in err
            ? String((err as { response?: { data?: { error?: string } } }).response?.data?.error || '')
            : '';
      setError(message || 'Something went wrong. Please check the URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (formatId: string, kind: 'video' | 'mp3', requestId: string): Promise<void> => {
    const downloadUrl = videoService.getDownloadUrl(currentUrl, formatId, {
      kind,
      title: videoInfo?.title,
      requestId,
    });
    trackEvent('quality_selected', { kind, formatId });
    const opened = window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    if (!opened || opened.closed) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = downloadUrl;
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 60_000);
    }
    trackEvent('download_started', { kind, formatId });
  };

  const handleDownloadStarted = () => {
    setClearSignal((n) => n + 1);
  };

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-20 px-4 md:px-6">
      <Helmet>
        <title>VibeDown | YouTube & Shorts — MP3 + HD, format-first</title>
        <meta
          name="description"
          content="Paste YouTube or Shorts, read the real format list, download MP3 or merged video up to 1080p when the source allows — Vite frontend, Python + yt-dlp API."
        />
        <meta
          name="keywords"
          content="vibedown, youtube downloader, shorts mp3, hd youtube download, format picker, yt-dlp"
        />
        <meta property="og:title" content="VibeDown — YouTube & Shorts, format-first" />
        <meta
          property="og:description"
          content="No generic “best” guesswork — pick MP3 or video quality from what YouTube exposes, then download through your API."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="VibeDown — YouTube & Shorts" />
        <meta
          name="twitter:description"
          content="Inspect formats, grab MP3 or HD — split-stack app you can self-host."
        />
        <link rel="canonical" href={canonicalUrl} />
        {pageSchemas.map((schema, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
        ))}
      </Helmet>

      <Navbar />

      <main className="max-w-7xl mx-auto">
        <div className="text-center space-y-6 mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-tight text-slate-900 dark:text-slate-50"
          >
            Pull the <span className="glow-text">vibe</span> — <br className="hidden sm:block" />
            YouTube &amp; Shorts, your rules.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-600 dark:text-slate-300 text-lg md:text-xl max-w-2xl mx-auto"
          >
            Paste a link, see the real format list, then save MP3 or merged HD — built as a sharp static UI plus a Python + yt-dlp API you deploy separately.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto"
          >
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-400/25">
              MP3 + HD Video
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-400/25">
              Shorts Supported
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">
              Split-stack (Vercel + API)
            </span>
          </motion.div>
        </div>

        <SearchBox onSearch={handleSearch} isLoading={isLoading} clearSignal={clearSignal} />
     
        <AnimatePresence mode="wait">
          {isLoading && <Skeleton key="skeleton" />}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl mx-auto mt-12 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-300"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}

          {videoInfo && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-5xl mx-auto mt-12"
            >
              <VideoCard info={videoInfo} />
              <FormatList formats={videoInfo.formats} onDownload={handleDownload} onDownloadStarted={handleDownloadStarted} />
            </motion.div>
          )}
        </AnimatePresence>

        <HistoryList 
          history={history} 
          onClear={clearHistory} 
          onSelect={handleSearch} 
        />

        <section className="max-w-5xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
          <article className="glass-card p-5">
            <h2 className="text-lg font-bold text-slate-100">Fast Video Info Fetch</h2>
            <p className="text-slate-300 text-sm mt-2">
              Paste a URL and instantly preview title, duration, uploader, and available quality options.
            </p>
          </article>
          <article className="glass-card p-5">
            <h2 className="text-lg font-bold text-slate-100">MP3 and HD Download</h2>
            <p className="text-slate-300 text-sm mt-2">
              Choose between audio-only MP3 and multiple video quality presets including up to 1080p when available.
            </p>
          </article>
          <article className="glass-card p-5">
            <h2 className="text-lg font-bold text-slate-100">Simple, Clean Experience</h2>
            <p className="text-slate-300 text-sm mt-2">
              No clutter, no complicated steps. Fetch, choose quality, and download with a modern interface.
            </p>
          </article>
        </section>
        <section className="max-w-5xl mx-auto mt-8 glass-card p-5">
          <h2 className="text-lg font-bold text-slate-100 mb-2">Help & Guides</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link className="text-purple-300 hover:text-purple-200" to="/blog/how-to-download-youtube-shorts-as-mp3">
              How to Download YouTube Shorts as MP3
            </Link>
            <Link className="text-purple-300 hover:text-purple-200" to="/blog/best-quality-settings-for-mobile-downloads">
              Best Quality Settings for Mobile Downloads
            </Link>
          </div>
        </section>
      </main>

      <footer className="mt-32 text-center text-slate-700 dark:text-slate-500 text-sm space-y-3">
        <p>© 2026 VibeDown. For personal use only. Respect creators&apos; rights.</p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <Link to="/how-it-works" className="text-purple-300 hover:text-purple-200">How It Works</Link>
          <span>•</span>
          <Link to="/faq" className="text-purple-300 hover:text-purple-200">FAQ</Link>
          <span>•</span>
          <Link to="/privacy" className="text-purple-300 hover:text-purple-200">Privacy</Link>
          <span>•</span>
          <Link to="/terms" className="text-purple-300 hover:text-purple-200">Terms</Link>
          <span>•</span>
          <Link to="/contact" className="text-purple-300 hover:text-purple-200">Contact</Link>
          <span>•</span>
          <Link to="/blog/how-to-download-youtube-shorts-as-mp3" className="text-purple-300 hover:text-purple-200">Shorts MP3 Guide</Link>
        </div>
      </footer>
    </div>
  );
}
