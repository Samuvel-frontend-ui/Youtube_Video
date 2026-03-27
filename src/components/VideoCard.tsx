import { motion } from 'motion/react';
import { Clock, User, ExternalLink } from 'lucide-react';
import { VideoInfo } from '../services/api';

interface VideoCardProps {
  info: VideoInfo;
}

export default function VideoCard({ info }: VideoCardProps) {
  const shareUrl = `https://www.youtube.com/watch?v=${info.id}`;

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Silent fail to avoid interrupting download flow.
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card overflow-hidden flex flex-col md:flex-row gap-6 p-6"
    >
      <div className="relative group shrink-0">
        <img 
          src={info.thumbnail} 
          alt={info.title}
          className="w-full md:w-80 aspect-video object-cover rounded-xl shadow-lg"
          referrerPolicy="no-referrer"
        />
        <div className="absolute bottom-2 right-2 bg-slate-900/80 text-slate-50 backdrop-blur-md px-2 py-1 rounded text-xs font-mono">
          {info.duration_string}
        </div>
      </div>

      <div className="flex flex-col justify-between py-2">
        <div>
          <h2 className="text-2xl font-bold leading-tight line-clamp-2 mb-4">
            {info.title}
          </h2>
          
          <div className="flex flex-wrap gap-4 text-slate-600 dark:text-slate-400 text-sm">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {info.uploader}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {info.duration_string}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <a 
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-purple-700 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            Watch on YouTube <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={handleCopyShare}
            className="text-sm text-slate-300 hover:text-white transition-colors"
            type="button"
          >
            Copy Share Link
          </button>
        </div>
      </div>
    </motion.div>
  );
}
