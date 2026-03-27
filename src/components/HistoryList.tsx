import { motion } from 'motion/react';
import { History, Trash2, Clock } from 'lucide-react';
import { HistoryItem } from '../hooks/useDownloadHistory';

interface HistoryListProps {
  history: HistoryItem[];
  onClear: () => void;
  onSelect: (url: string) => void;
}

export default function HistoryList({ history, onClear, onSelect }: HistoryListProps) {
  if (history.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-5xl mx-auto mt-16"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
          <History className="w-6 h-6 text-purple-400" />
          Recent Downloads
        </div>
        <button
          onClick={onClear}
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {history.map((item) => (
          <motion.div
            key={item.id + item.timestamp}
            whileHover={{ y: -5 }}
            onClick={() => onSelect(item.url)}
            className="glass-card overflow-hidden cursor-pointer group"
          >
            <div className="relative aspect-video">
              <img 
                src={item.thumbnail} 
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-900/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-xs font-bold bg-white text-slate-900 px-3 py-1 rounded-full">Re-fetch</span>
              </div>
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium line-clamp-1 mb-1">{item.title}</h3>
              <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400">
                <Clock className="w-3 h-3" />
                {new Date(item.timestamp).toLocaleDateString()}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
