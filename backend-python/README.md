# VibeDown API (Python)

FastAPI + **yt-dlp** + **ffmpeg**. Same JSON routes as the old Node server: `/api/health`, `POST /api/video-info`, `GET /api/download`, `GET /api/download-status`.

## Will this work on Vercel?

**Not recommended.** Vercel Python functions have short timeouts, no bundled ffmpeg, and large cold starts. Use **Render** (this repo includes a `Dockerfile`).

## Deploy on Render (recommended)

1. Push `backend-python/` to its **own Git repository** (or use a monorepo with **Root Directory** = `backend-python`).
2. New **Web Service** → **Docker** → connect the repo.
3. Set environment variables:
   - `FRONTEND_ORIGIN` = your Vite site origin, e.g. `https://your-app.vercel.app` (comma-separate multiple origins). Use `*` only for quick tests.
   - Optional: `YOUTUBE_COOKIE` = raw `Cookie` header value for bot-gated videos (private use; do not commit).
4. After deploy, copy the service URL, e.g. `https://vibedown-api.onrender.com`.

## Point the Vercel frontend at this API

In the **Vercel** project (frontend only):

1. **Settings → Environment Variables** (Production + Preview):
   - `VITE_API_URL` = `https://your-render-service.onrender.com`  
     (no trailing slash; the app appends `/api/...`).
2. Redeploy the frontend so Vite bakes in the variable.

Locally, `vite` proxies `/api` to `http://127.0.0.1:8000` unless `VITE_BACKEND_URL` overrides it.

## Local run

```bash
cd backend-python
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
# Install ffmpeg and add to PATH (Windows: winget install ffmpeg)
uvicorn main:app --reload --port 8000
```

In another terminal, from the repo root: `npm run dev` → frontend uses the proxy to port 8000.

## Confirm it works

- `GET https://<api>/api/health` → `youtubeEngine: "yt-dlp"`.
- Paste a YouTube URL in the app → formats load → download MP3 or a quality preset.
