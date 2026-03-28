# VibeDown — Frontend

React 19 + Vite 6 + Tailwind 4. All UI, assets, and Vercel config live in this folder.

## Local

```bash
npm install
npm run dev
```

Vite serves the app (default port **3000**) and proxies **`/api`** → `http://127.0.0.1:8000` (override with **`VITE_BACKEND_URL`** in `.env`).

### Run UI + API together (sibling `backend/` folder)

From **`frontend/`** (needs Python deps + ffmpeg installed for the API):

```bash
npm install
npm run dev:all
```

This runs Vite and `uvicorn` in parallel.

## Build

```bash
npm run build
```

Output: **`dist/`** (ignored by git).

## Deploy on Vercel

1. Connect this repo (or a repo that contains only this folder as root).
2. If the monorepo layout is used: set Vercel **Root Directory** to **`frontend`**.
3. **Environment variables:** **`VITE_API_URL`** = your Render API origin, e.g. `https://your-api.onrender.com` (no trailing slash).
4. Redeploy after changing env vars.

## Environment (`.env`)

Copy **`.env.example`** → **`.env`**. Vite reads variables from this directory.

| Variable | When |
|----------|------|
| `VITE_API_URL` | Production / preview: full API origin (no `/api` suffix). |
| `VITE_BACKEND_URL` | Local dev if API is not on `127.0.0.1:8000`. |
| `VITE_DEV_PORT` | Optional Vite port override. |

## Layout

| Path | Role |
|------|------|
| `src/` | Components, pages, hooks |
| `src/services/api.ts` | Axios → `VITE_API_URL` or `/api` |
| `vite.config.ts` | Dev proxy, plugins |
| `vercel.json` | SPA rewrite + asset caching |
