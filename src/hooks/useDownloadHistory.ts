import { useState, useEffect } from 'react';

export interface HistoryItem {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  timestamp: number;
}

export function useDownloadHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('videdown_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const addToHistory = (item: Omit<HistoryItem, 'timestamp'>) => {
    const newItem = { ...item, timestamp: Date.now() };
    const updated = [newItem, ...history.filter(h => h.id !== item.id)].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('videdown_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('videdown_history');
  };

  return { history, addToHistory, clearHistory };
}
