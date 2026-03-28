import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function HowItWorks() {
  const navigate = useNavigate();
  const canonicalUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/how-it-works` : 'https://vibedown.vercel.app/how-it-works';

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-20 px-4 md:px-6">
      <Helmet>
        <title>How It Works | VibeDown</title>
        <meta
          name="description"
          content="Learn how VibeDown works: fetch video info, choose quality, and download YouTube videos or Shorts."
        />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonicalUrl} />
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
          <h1 className="text-3xl font-black text-slate-100">How It Works</h1>
          <ol className="mt-4 space-y-3 text-slate-300 list-decimal list-inside">
            <li>Paste a supported video URL.</li>
            <li>Click Fetch to load available formats.</li>
            <li>Select Video or Audio quality and confirm download.</li>
            <li>Your browser starts the download automatically.</li>
          </ol>
          <p className="text-slate-300 mt-4">
            For best results, start with Recommended tab, then switch to Video or Audio based on your quality or size preference.
          </p>
        </section>
        <section className="glass-card p-5 mt-4 text-sm text-slate-300">
          Related pages:{' '}
          <Link className="text-purple-300 hover:text-purple-200" to="/faq">FAQ</Link>
          <span className="mx-2">•</span>
          <Link className="text-purple-300 hover:text-purple-200" to="/blog/best-quality-settings-for-mobile-downloads">
            Mobile Quality Guide
          </Link>
        </section>
      </main>
    </div>
  );
}
