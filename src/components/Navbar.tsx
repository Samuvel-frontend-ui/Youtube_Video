import { motion } from 'motion/react';
import { Download } from 'lucide-react';
import { useEffect } from 'react';

interface NavbarProps {
  contactHref?: string;
  contactLabel?: string;
}

export default function Navbar({ contactHref = '/contact', contactLabel = 'Contact Us' }: NavbarProps) {
  const isContactButton = contactHref === '/contact' || contactLabel.toLowerCase().includes('contact');
  useEffect(() => {
    // App is dark-only.
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-3 md:px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-card px-4 md:px-6 py-3">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Download className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Vibe<span className="glow-text">Down</span>
          </span>
        </motion.div>

        <div>
          <a href={contactHref} className="btn-secondary py-2 px-4 text-sm" aria-label={contactLabel}>
            {isContactButton ? `📞 ${contactLabel}` : contactLabel}
          </a>
        </div>
      </div>
    </nav>
  );
}
