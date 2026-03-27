import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function FAQ() {
  const navigate = useNavigate();
  const canonicalUrl = typeof window !== 'undefined' ? `${window.location.origin}/faq` : 'https://vibedown.vercel.app/faq';

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-20 px-4 md:px-6">
      <Helmet>
        <title>FAQ | VibeDown</title>
        <meta
          name="description"
          content="Read frequently asked questions about VibeDown downloads, formats, quality options, and usage limits."
        />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>
      <Navbar contactHref="/" contactLabel="Back to Home" />
      <main className="max-w-4xl mx-auto space-y-4">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="btn-secondary py-2 px-4 text-sm"
        >
          ← Back
        </button>
        <section className="glass-card p-6">
          <h1 className="text-3xl font-black text-slate-100">FAQ</h1>
          <p className="text-slate-300 mt-2">Answers to common questions about downloads and quality options.</p>
        </section>
        <section className="glass-card p-6 space-y-4">
          <div>
            <h2 className="font-bold text-slate-100">Why does some video not show 1080p?</h2>
            <p className="text-slate-300">Some uploads are available only in lower resolutions from source.</p>
          </div>
          <div>
            <h2 className="font-bold text-slate-100">Why might MP3 fail sometimes?</h2>
            <p className="text-slate-300">Restricted content or temporary extractor issues can fail conversion.</p>
          </div>
          <div>
            <h2 className="font-bold text-slate-100">How many downloads are allowed?</h2>
            <p className="text-slate-300">Rate limits are applied to keep service stable for all users.</p>
          </div>
          <div>
            <h2 className="font-bold text-slate-100">How do I get faster downloads?</h2>
            <p className="text-slate-300">Use recommended format options and avoid retrying multiple times in parallel.</p>
          </div>
        </section>
        <section className="glass-card p-5 text-sm text-slate-300">
          Need help with specific scenarios? Read:{' '}
          <Link className="text-purple-300 hover:text-purple-200" to="/how-it-works">How It Works</Link>
          <span className="mx-2">•</span>
          <Link className="text-purple-300 hover:text-purple-200" to="/blog/how-to-download-youtube-shorts-as-mp3">
            Shorts to MP3 Guide
          </Link>
        </section>
      </main>
    </div>
  );
}
