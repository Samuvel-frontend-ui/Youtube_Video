import { Helmet } from 'react-helmet-async';
import { Mail, Phone, Globe, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Contact() {
  const navigate = useNavigate();
  const canonicalUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/contact` : 'https://vibedown.vercel.app/contact';

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-20 px-4 md:px-6">
      <Helmet>
        <title>Contact Us | VibeDown</title>
        <meta
          name="description"
          content="Contact VibeDown for website creation, downloader setup, and support services."
        />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content="Contact VibeDown" />
        <meta
          property="og:description"
          content="Get in touch for website development, custom web app support, and UI/UX improvements."
        />
        <meta property="og:url" content={canonicalUrl} />
      </Helmet>

      <Navbar contactHref="/" contactLabel="Back to Home" />

      <main className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="btn-secondary py-2 px-4 text-sm mb-4"
        >
          ← Back
        </button>
        <section className="glass-card p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-100">Contact Us</h1>
          <p className="mt-3 text-slate-300 leading-relaxed">
            If you want to create a website, improve your existing website, or need help with web app features,
            contact us. We provide complete support from idea to deployment with clean design and reliable code.
          </p>
          <p className="mt-2 text-sm text-slate-400">Typical response time: within 24 hours.</p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="glass-card p-5">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Direct Contact</h2>
            <div className="space-y-3 text-slate-300">
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-purple-400" />
                <span>Phone:</span>
                <a href="tel:9789419084" className="text-purple-400 hover:text-purple-300">
                  9789419084
                </a>
              </p>
              <p className="flex items-center gap-2 break-all">
                <Mail className="w-4 h-4 text-purple-400" />
                <span>Email:</span>
                <a href="mailto:samuve240904@gmail.com" className="text-purple-400 hover:text-purple-300">
                  samuve240904@gmail.com
                </a>
              </p>
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Services</h2>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <Globe className="w-4 h-4 mt-1 text-purple-400" />
                <span>Business websites, portfolio sites, and landing pages</span>
              </li>
              <li className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 mt-1 text-purple-400" />
                <span>Custom web applications, admin dashboards, and API integrations</span>
              </li>
              <li className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 mt-1 text-purple-400" />
                <span>UI/UX improvements, responsive design, and deployment support</span>
              </li>
            </ul>
          </div>
        </section>
        <section className="mt-6 text-center text-xs text-slate-400">
          <Link to="/how-it-works" className="text-purple-300 hover:text-purple-200">How It Works</Link>
          <span className="mx-2">•</span>
          <Link to="/faq" className="text-purple-300 hover:text-purple-200">FAQ</Link>
          <span className="mx-2">•</span>
          <Link to="/privacy" className="text-purple-300 hover:text-purple-200">Privacy</Link>
          <span className="mx-2">•</span>
          <Link to="/terms" className="text-purple-300 hover:text-purple-200">Terms</Link>
        </section>
      </main>
    </div>
  );
}
