import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function MobileQualityGuide() {
  const navigate = useNavigate();
  const canonicalUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/blog/best-quality-settings-for-mobile-downloads`
      : 'https://vibedown.vercel.app/blog/best-quality-settings-for-mobile-downloads';

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-20 px-4 md:px-6">
      <Helmet>
        <title>Best Quality Settings for Mobile Downloads | VibeDown</title>
        <meta
          name="description"
          content="Learn which download quality to choose for mobile storage, speed, and playback quality."
        />
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
        <section className="glass-card p-6 md:p-8 space-y-3">
          <h1 className="text-3xl font-black text-slate-100">Best Quality Settings for Mobile Downloads</h1>
          <p className="text-slate-300">
            Choosing the right video quality depends on your screen size, storage, and data limits. Use these quick
            recommendations for better experience.
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-1">
            <li>360p: fastest download, lowest data usage.</li>
            <li>480p: balanced quality for budget devices.</li>
            <li>720p: best default for most modern phones.</li>
            <li>1080p: highest quality, larger file size.</li>
            <li>MP3: audio-only mode for music/podcasts.</li>
          </ul>
        </section>
        <section className="glass-card p-5 text-sm text-slate-300">
          Explore more guides:{' '}
          <Link className="text-purple-300 hover:text-purple-200" to="/blog/how-to-download-youtube-shorts-as-mp3">
            How to download YouTube Shorts as MP3
          </Link>
          .
        </section>
      </main>
    </div>
  );
}

