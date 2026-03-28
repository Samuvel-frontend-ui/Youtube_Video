import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Privacy() {
  const navigate = useNavigate();
  const canonicalUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/privacy` : 'https://vibedown.vercel.app/privacy';

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-20 px-4 md:px-6">
      <Helmet>
        <title>Privacy Policy | VibeDown</title>
        <meta
          name="description"
          content="Read the VibeDown privacy policy and learn what technical data is processed for service reliability."
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
          <h1 className="text-3xl font-black text-slate-100">Privacy Policy</h1>
          <p className="text-slate-300">We do not sell personal data.</p>
          <p className="text-slate-300">
            We may log technical request data (IP, timestamp, route) for security, abuse prevention, and service stability.
          </p>
          <p className="text-slate-300">
            Contact details submitted through direct channels are used only to respond to your request.
          </p>
          <p className="text-slate-300">
            We keep operational logs only as long as needed for reliability monitoring and abuse prevention.
          </p>
        </section>
        <section className="glass-card p-5 mt-4 text-sm text-slate-300">
          Related pages:{' '}
          <Link className="text-purple-300 hover:text-purple-200" to="/terms">Terms</Link>
          <span className="mx-2">•</span>
          <Link className="text-purple-300 hover:text-purple-200" to="/contact">Contact</Link>
        </section>
      </main>
    </div>
  );
}
