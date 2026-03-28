import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Terms() {
  const navigate = useNavigate();
  const canonicalUrl = typeof window !== 'undefined' ? `${window.location.origin}/terms` : 'https://vibedown.vercel.app/terms';

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-20 px-4 md:px-6">
      <Helmet>
        <title>Terms | VibeDown</title>
        <meta
          name="description"
          content="Read the VibeDown terms of use for lawful downloading, platform compliance, and service limitations."
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
        <section className="glass-card p-6 md:p-8 space-y-3">
          <h1 className="text-3xl font-black text-slate-100">Terms of Use</h1>
          <p className="text-slate-300">
            Use this service only for content you own or have rights to download.
          </p>
          <p className="text-slate-300">
            You are responsible for complying with platform policies and copyright laws in your region.
          </p>
          <p className="text-slate-300">
            Service availability and supported formats may change without notice.
          </p>
          <p className="text-slate-300">
            You agree not to use this service for illegal distribution or copyright infringement.
          </p>
        </section>
        <section className="glass-card p-5 mt-4 text-sm text-slate-300">
          See also:{' '}
          <Link className="text-purple-300 hover:text-purple-200" to="/privacy">Privacy Policy</Link>
          <span className="mx-2">•</span>
          <Link className="text-purple-300 hover:text-purple-200" to="/faq">FAQ</Link>
        </section>
      </main>
    </div>
  );
}
