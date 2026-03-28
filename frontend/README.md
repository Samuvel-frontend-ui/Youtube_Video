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

1. Connect this repo (monorepo: build from repo root per root `vercel.json`, or set **Root Directory** to **`frontend`** if you use a frontend-only repo).
2. **No `VITE_API_URL` needed** — production API origin is hardcoded in **`src/services/api.ts`** (`REMOTE_API_ORIGIN`). Edit that constant if your API URL changes.

## Environment (`.env`) — local dev only

Copy **`.env.example`** → **`.env`** for optional overrides while developing.

| Variable | When |
|----------|------|
| `VITE_BACKEND_URL` | Dev: proxy `/api` target if not `http://127.0.0.1:8000`. |
| `VITE_DEV_PORT` | Optional Vite port. |

## Layout

| Path | Role |
|------|------|
| `src/` | Components, pages, hooks |
| `src/services/api.ts` | Axios: dev → `/api` proxy; prod → hardcoded Render origin + `/api` |
| `vite.config.ts` | Dev proxy, plugins |
| `vercel.json` | SPA rewrite + asset caching |
