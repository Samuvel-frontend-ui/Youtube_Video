import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function ShortsMp3Guide() {
  const navigate = useNavigate();
  const canonicalUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/blog/how-to-download-youtube-shorts-as-mp3`
      : 'https://vibedown.vercel.app/blog/how-to-download-youtube-shorts-as-mp3';

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-20 px-4 md:px-6">
      <Helmet>
        <title>How to Download YouTube Shorts as MP3 | VibeDown</title>
        <meta
          name="description"
          content="Step-by-step guide to convert YouTube Shorts to MP3 audio using VibeDown quickly and safely."
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
          <h1 className="text-3xl font-black text-slate-100">How to Download YouTube Shorts as MP3</h1>
          <p className="text-slate-300">
            Paste the Shorts URL, click Fetch, choose the MP3 tab, and confirm download. VibeDown extracts audio so
            you can save podcasts, voice clips, and songs from short-form videos.
          </p>
          <ol className="list-decimal list-inside text-slate-300 space-y-1">
            <li>Copy a YouTube Shorts link.</li>
            <li>Open VibeDown home page and paste the link.</li>
            <li>Click Fetch Video Info.</li>
            <li>Select Audio tab and choose MP3.</li>
            <li>Confirm in popup and start download.</li>
          </ol>
        </section>
        <section className="glass-card p-5 text-sm text-slate-300">
          Explore more guides:{' '}
          <Link className="text-purple-300 hover:text-purple-200" to="/blog/best-quality-settings-for-mobile-downloads">
            Best quality settings for mobile downloads
          </Link>
          .
        </section>
      </main>
    </div>
  );
}

