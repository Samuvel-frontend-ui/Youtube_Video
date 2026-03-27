import { motion } from 'motion/react';

export default function Skeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto mt-12 space-y-8">
      <div className="glass-card p-6 flex flex-col md:flex-row gap-6 animate-pulse">
        <div className="w-full md:w-80 aspect-video bg-white/5 rounded-xl" />
        <div className="flex-1 space-y-4 py-2">
          <div className="h-8 bg-white/5 rounded-lg w-3/4" />
          <div className="h-4 bg-white/5 rounded-lg w-1/2" />
          <div className="h-4 bg-white/5 rounded-lg w-1/4" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-4 h-32 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-white/5" />
              <div className="space-y-2">
                <div className="h-4 bg-white/5 rounded w-16" />
                <div className="h-3 bg-white/5 rounded w-10" />
              </div>
            </div>
            <div className="h-10 bg-white/5 rounded-xl w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
