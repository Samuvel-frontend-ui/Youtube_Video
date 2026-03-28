# VibeDown

This repository has **two top-level folders only**:

- **`frontend/`** — Vite + React app (see **`frontend/README.md`**).
- **`backend/`** — FastAPI + yt-dlp API (see **`backend/README.md`**).

**`.gitignore`:** root only ignores hoisted **`node_modules/`** (npm workspaces). **`frontend/.gitignore`** and **`backend/.gitignore`** cover each app.

**Vercel:** root **`package.json`** (workspace) + **`vercel.json`** build **`frontend/`** → **`frontend/dist`**. Production API URL is hardcoded in **`frontend/src/services/api.ts`** (`REMOTE_API_ORIGIN`), not env vars.

If an old **`backend-python/`** folder appears, delete it manually — the API is **`backend/`** only.
