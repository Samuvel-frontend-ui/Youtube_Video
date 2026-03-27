import { motion } from 'motion/react';
import { Search, Loader2, Clipboard } from 'lucide-react';
import { useState, FormEvent, useEffect } from 'react';

interface SearchBoxProps {
  onSearch: (url: string) => void;
  isLoading: boolean;
  clearSignal?: number;
}

export default function SearchBox({ onSearch, isLoading, clearSignal = 0 }: SearchBoxProps) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    setUrl('');
  }, [clearSignal]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSearch(url.trim());
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      if (text.includes('youtube.com') || text.includes('youtu.be')) {
        onSearch(text);
      }
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full max-w-3xl mx-auto mt-12"
    >
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-2xl group-hover:blur-3xl transition-all duration-500 -z-10" />
        
        <div className="relative flex flex-col sm:flex-row items-center gap-3 sm:gap-0">
          <div className="absolute left-4 sm:left-6 top-[28px] sm:top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 z-10">
            <Search className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube link here..."
            className="glass-input w-full pl-12 sm:pl-16 pr-12 sm:pr-32 text-base sm:text-lg min-h-[56px]"
          />

          <div className="absolute right-2 top-[28px] sm:top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2 sm:hidden">
            <button
              type="button"
              onClick={handlePaste}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all"
              title="Paste from clipboard"
            >
              <Clipboard className="w-5 h-5" />
            </button>
          </div>

          <div className="hidden sm:flex absolute right-3 items-center gap-2">
            <button
              type="button"
              onClick={handlePaste}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all"
              title="Paste from clipboard"
            >
              <Clipboard className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={isLoading || !url}
              className="btn-primary py-2 px-6 text-sm"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Fetch'
              )}
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !url}
          className="btn-primary w-full mt-3 sm:hidden py-3 text-base flex justify-center items-center gap-2"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Fetch Video Info'}
        </button>
      </form>
      
      <p className="text-center mt-4 text-slate-600 dark:text-slate-400 text-sm">
        Supports YouTube links including Shorts. For personal and lawful use only.
      </p>
    </motion.div>
  );
}
