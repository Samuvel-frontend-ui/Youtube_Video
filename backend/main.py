"""
VibeDown YouTube API — same contract as the old Node /api routes.

- Production: Render + Dockerfile (ffmpeg + yt-dlp).
- Vercel: see backend/index.py + vercel.json — metadata routes work; downloads need ffmpeg (not on Vercel).
"""

from __future__ import annotations

import os
import re
import shutil
import sys
import time
import tempfile
import unicodedata
import subprocess
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, quote, urlencode, urlparse, urlunparse

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from starlette.background import BackgroundTask
import yt_dlp

VIDEO_INFO_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
VIDEO_INFO_TTL = 180
DOWNLOAD_PROGRESS: dict[str, dict[str, Any]] = {}
DOWNLOAD_PROGRESS_TTL = 600

# Browser origins allowed to call this API (no env — edit here if the frontend URL changes).
ALLOWED_CORS_ORIGINS: tuple[str, ...] = (
    "https://youtube-video-jade.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)


app = FastAPI(title="VibeDown API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(ALLOWED_CORS_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def cleanup_download_progress() -> None:
    cutoff = time.time() - DOWNLOAD_PROGRESS_TTL
    stale = [k for k, v in DOWNLOAD_PROGRESS.items() if v.get("updatedAt", 0) < cutoff]
    for k in stale:
        DOWNLOAD_PROGRESS.pop(k, None)


def normalize_video_url(raw_url: str) -> str:
    raw_url = raw_url.strip()
    try:
        p = urlparse(raw_url)
        host = (p.hostname or "").lower()
        qs = parse_qs(p.query, keep_blank_values=True)
        qs.pop("si", None)
        pairs: list[tuple[str, str]] = []
        for k in sorted(qs.keys()):
            for v in qs[k]:
                pairs.append((k, v))
        new_query = urlencode(pairs)
        p = p._replace(query=new_query)
        base = urlunparse(p)

        if host == "youtu.be":
            vid = p.path.strip("/").split("/")[0]
            if vid:
                return f"https://www.youtube.com/watch?v={vid}"
        if host.endswith("youtube.com"):
            m = re.match(r"^/shorts/([^/?#]+)", p.path, re.I)
            if m:
                return f"https://www.youtube.com/watch?v={m.group(1)}"
        return base
    except Exception:
        return raw_url


def is_http_url(url: str) -> bool:
    try:
        return urlparse(url).scheme in ("http", "https")
    except Exception:
        return False


def is_youtube_url(url: str) -> bool:
    try:
        h = (urlparse(url).hostname or "").lower()
        return (
            h == "youtu.be"
            or h.endswith("youtube.com")
            or h.endswith("youtube-nocookie.com")
            or h == "music.youtube.com"
        )
    except Exception:
        return False


def format_duration(sec: int) -> str:
    if sec < 0:
        return ""
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def format_height_from_fmt(f: dict[str, Any]) -> int:
    h = f.get("height")
    if isinstance(h, int) and h > 0:
        return h
    for key in ("resolution", "format_note"):
        m = re.search(r"(\d{3,4})p", str(f.get(key) or ""), re.I)
        if m:
            return int(m.group(1))
    return 0


def build_video_info_payload(url: str) -> dict[str, Any]:
    cookie = os.environ.get("YOUTUBE_COOKIE", "").strip()
    ydl_opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "extract_flat": False,
        "skip_download": True,
        "socket_timeout": 30,
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "web", "ios"],
            }
        },
    }
    if cookie:
        ydl_opts["http_headers"] = {"Cookie": cookie}

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
    if not info:
        raise ValueError("No metadata returned")

    vid = str(info.get("id") or "")
    title = str(info.get("title") or "Untitled")
    duration = int(info.get("duration") or 0)
    uploader = str(info.get("uploader") or info.get("channel") or "Unknown")
    thumbs = info.get("thumbnails") or []
    thumb = str(thumbs[-1].get("url", "")) if thumbs else str(info.get("thumbnail") or "")

    formats: list[dict[str, Any]] = info.get("formats") or []
    progressive_out: list[dict[str, Any]] = []
    max_vonly = 0

    for f in formats:
        vcodec = str(f.get("vcodec") or "none")
        acodec = str(f.get("acodec") or "none")
        if vcodec != "none" and acodec == "none":
            max_vonly = max(max_vonly, format_height_from_fmt(f))

    for f in formats:
        vcodec = str(f.get("vcodec") or "none")
        acodec = str(f.get("acodec") or "none")
        if vcodec == "none" or acodec == "none":
            continue
        ext = str(f.get("ext") or "mp4").lower()
        if ext not in ("mp4", "webm"):
            continue
        if not f.get("url"):
            continue
        h = format_height_from_fmt(f)
        ql = str(f.get("format_note") or f.get("quality_label") or (f"{h}p" if h else ""))
        fid = str(f.get("format_id") or "")
        if not fid:
            continue
        progressive_out.append(
            {
                "format_id": fid,
                "ext": ext,
                "resolution": ql or (f"{h}p" if h else ""),
                "filesize": f.get("filesize") or f.get("filesize_approx"),
                "quality": ql or (f"{h}p" if h else "Unknown"),
                "format_type": "video+audio",
                "_h": h,
            }
        )

    progressive_out.sort(key=lambda x: (-int(x["_h"]), x["format_id"]))
    max_prog = max((int(x["_h"]) for x in progressive_out), default=0)
    cap = max(max_vonly, max_prog, 360)

    preset_heights = [x for x in (360, 480, 720, 1080) if x <= cap]
    presets = [
        {
            "format_id": f"q-{h}p",
            "ext": "mp4",
            "resolution": f"{h}p",
            "quality": f"{h}p (recommended)",
            "format_type": "video+audio",
        }
        for h in preset_heights
    ]

    video_formats = [{k: v for k, v in p.items() if k != "_h"} for p in progressive_out]

    list_formats: list[dict[str, Any]] = [
        {
            "format_id": "mp3",
            "ext": "mp3",
            "resolution": "audio",
            "quality": "MP3 (audio only)",
            "format_type": "audio-only",
        },
        *presets,
        *video_formats,
    ]

    return {
        "id": vid,
        "title": title,
        "thumbnail": thumb,
        "duration": duration,
        "duration_string": format_duration(duration),
        "uploader": uploader,
        "formats": list_formats,
    }


class VideoInfoBody(BaseModel):
    url: str


def ytdlp_cmd() -> list[str]:
    return [sys.executable, "-m", "yt_dlp", "--no-playlist", "--no-warnings"]


def ffmpeg_install_hint() -> str:
    return (
        "Install ffmpeg so both ffmpeg and ffprobe are available. Windows: run "
        "`winget install ffmpeg` (or install from https://ffmpeg.org/download.html), then restart the terminal. "
        "If binaries are not on PATH, set environment variable FFMPEG_LOCATION to the folder that contains "
        "ffmpeg.exe and ffprobe.exe (e.g. C:\\\\ffmpeg\\\\bin). On Render, use the repo Dockerfile — ffmpeg is included."
    )


def _ffmpeg_dir_from_env_or_path() -> Path | None:
    raw = os.environ.get("FFMPEG_LOCATION", "").strip().strip('"')
    if raw:
        p = Path(raw)
        d = p.resolve().parent if p.is_file() else p.resolve() if p.is_dir() else Path(raw)
        ff = d / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
        fp = d / ("ffprobe.exe" if os.name == "nt" else "ffprobe")
        if ff.is_file() and fp.is_file():
            return d
    w = shutil.which("ffmpeg")
    if not w:
        return None
    d = Path(w).resolve().parent
    fp = d / ("ffprobe.exe" if os.name == "nt" else "ffprobe")
    return d if fp.is_file() else None


def has_ffmpeg_tools() -> bool:
    d = _ffmpeg_dir_from_env_or_path()
    if not d:
        return False
    ff = d / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
    fp = d / ("ffprobe.exe" if os.name == "nt" else "ffprobe")
    return ff.is_file() and fp.is_file()


def ffmpeg_location_cli_args() -> list[str]:
    d = _ffmpeg_dir_from_env_or_path()
    if not d:
        return []
    return ["--ffmpeg-location", str(d)]


def cookie_args() -> list[str]:
    c = os.environ.get("YOUTUBE_COOKIE", "").strip()
    if not c:
        return []
    return ["--add-header", f"Cookie: {c}"]


def run_ytdlp_to_dir(tmpdir: Path, url: str, fmt_args: list[str], timeout: int = 1800) -> Path:
    """Write to tmpdir using a template so yt-dlp picks the correct extension after merge/extract."""
    before = {p.resolve() for p in tmpdir.iterdir()} if tmpdir.exists() else set()
    template = str(tmpdir / "vibedown.%(ext)s")
    cmd = (
        ytdlp_cmd()
        + ffmpeg_location_cli_args()
        + [
            "--extractor-args",
            "youtube:player_client=android,web,ios",
        ]
        + cookie_args()
        + fmt_args
        + ["-o", template, url]
    )
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        msg = (r.stderr or r.stdout or "yt-dlp failed").strip()
        if "ERROR:" in msg:
            msg = msg.split("ERROR:")[-1].split("\n")[0].strip()
        raise RuntimeError(msg or "yt-dlp failed")
    after = sorted(
        (p for p in tmpdir.iterdir() if p.is_file() and p.resolve() not in before),
        key=lambda p: p.stat().st_mtime,
    )
    if not after:
        after = sorted(tmpdir.glob("vibedown.*"), key=lambda p: p.stat().st_mtime)
    if not after:
        raise RuntimeError("yt-dlp finished but no output file was found.")
    return after[-1]


def media_type_for_path(path: Path) -> str:
    ext = path.suffix.lower()
    if ext == ".mp3":
        return "audio/mpeg"
    if ext in (".mp4", ".m4v"):
        return "video/mp4"
    if ext == ".webm":
        return "video/webm"
    if ext in (".m4a", ".aac"):
        return "audio/mp4"
    return "application/octet-stream"


def sanitize_filename_part(s: str, fb: str) -> str:
    s = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", s)
    s = re.sub(r"\s+", " ", s).strip()[:120]
    return s or fb


def to_ascii_filename(s: str, fb: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if 32 <= ord(c) < 127)
    s = re.sub(r"\s+", " ", s).strip()[:120]
    return s or fb


def rm_tree(p: Path) -> None:
    if not p.exists():
        return
    for c in p.iterdir():
        if c.is_file():
            c.unlink(missing_ok=True)
        else:
            rm_tree(c)
            try:
                c.rmdir()
            except OSError:
                pass
    try:
        p.rmdir()
    except OSError:
        pass


@app.get("/api/health")
def health() -> dict[str, Any]:
    try:
        from importlib.metadata import version

        ver = version("yt-dlp")
    except Exception:
        ver = "unknown"
    ff_dir = _ffmpeg_dir_from_env_or_path()
    return {
        "ok": True,
        "env": os.environ.get("ENV", "production"),
        "youtubeEngine": "yt-dlp",
        "ytdlCoreVersion": ver,
        "hasYoutubeCookie": bool(os.environ.get("YOUTUBE_COOKIE", "").strip()),
        "hasFfmpeg": has_ffmpeg_tools(),
        "ffmpegLocation": str(ff_dir) if ff_dir else None,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.post("/api/video-info")
def video_info(body: VideoInfoBody) -> Any:
    url = normalize_video_url(body.url)
    if not url:
        return JSONResponse({"error": "URL is required"}, status_code=400)
    if not is_http_url(url):
        return JSONResponse({"error": "URL must be a valid http(s) link."}, status_code=400)
    if not is_youtube_url(url):
        return JSONResponse({"error": "Only YouTube links are supported."}, status_code=400)

    now = time.time()
    ent = VIDEO_INFO_CACHE.get(url)
    if ent and ent[0] > now:
        return ent[1]

    try:
        payload = build_video_info_payload(url)
    except Exception as e:
        msg = str(e)
        low = msg.lower()
        if re.search(r"sign in|not a bot|bot|login required|private|unavailable|captcha|members only", low):
            return JSONResponse(
                {
                    "error": msg,
                    "code": "YOUTUBE_BOT_GATE",
                    "hint": "YouTube may be blocking this host. Try another video or set YOUTUBE_COOKIE on the API (private use only).",
                },
                status_code=503,
            )
        return JSONResponse({"error": msg or "Failed to fetch video info."}, status_code=500)

    VIDEO_INFO_CACHE[url] = (now + VIDEO_INFO_TTL, payload)
    return payload


@app.get("/api/download")
def download(
    url: str = Query(""),
    format_id: str = Query("best", alias="format_id"),
    title: str = Query(""),
    kind: str = Query("video"),
    request_id: str = Query("", alias="request_id"),
) -> Any:
    cleanup_download_progress()
    url = normalize_video_url(url)
    if not url:
        return JSONResponse({"error": "URL is required"}, status_code=400)
    if not is_http_url(url):
        return JSONResponse({"error": "URL must be a valid http(s) link."}, status_code=400)
    if not is_youtube_url(url):
        return JSONResponse({"error": "Only YouTube links are supported."}, status_code=400)

    fmt = (format_id or "best").strip()
    is_mp3 = fmt.lower() == "mp3" or (kind or "").lower() == "mp3"

    if request_id:
        DOWNLOAD_PROGRESS[request_id] = {"state": "preparing", "updatedAt": time.time()}

    title_part = sanitize_filename_part(title, "vibedown")
    ascii_title = to_ascii_filename(title, "vibedown")
    label = "best" if fmt == "best" else fmt

    tmpdir = Path(tempfile.mkdtemp(prefix="vibedown-"))

    def cleanup() -> None:
        rm_tree(tmpdir)

    if not has_ffmpeg_tools():
        msg = "ffmpeg and ffprobe are required for MP3 extraction and video+audio merges, but they were not found."
        if request_id:
            DOWNLOAD_PROGRESS[request_id] = {
                "state": "failed",
                "error": msg,
                "updatedAt": time.time(),
            }
        return JSONResponse(
            {"error": msg, "hint": ffmpeg_install_hint()},
            status_code=503,
        )

    try:
        if request_id:
            DOWNLOAD_PROGRESS[request_id] = {
                "state": "downloading",
                "percent": 5,
                "updatedAt": time.time(),
            }

        if is_mp3:
            out = run_ytdlp_to_dir(
                tmpdir,
                url,
                ["-x", "--audio-format", "mp3", "--audio-quality", "2"],
            )
        elif re.match(r"^q-(\d{3,4})p$", fmt, re.I):
            m = re.match(r"^q-(\d{3,4})p$", fmt, re.I)
            h = int(m.group(1)) if m else 720
            sel = (
                f"bestvideo[height<={h}][ext=mp4]+bestaudio[ext=m4a]/"
                f"bestvideo[height<={h}]+bestaudio/best[height<={h}]/best"
            )
            out = run_ytdlp_to_dir(tmpdir, url, ["-f", sel, "--merge-output-format", "mp4"])
        elif fmt == "best":
            out = run_ytdlp_to_dir(
                tmpdir,
                url,
                ["-f", "bestvideo+bestaudio/best", "--merge-output-format", "mp4"],
            )
        else:
            out = run_ytdlp_to_dir(tmpdir, url, ["-f", fmt, "--merge-output-format", "mp4"])

        if not out.is_file():
            raise RuntimeError("Download finished but output file is missing.")

        file_ext = (out.suffix or ".bin").lstrip(".") or ("mp3" if is_mp3 else "mp4")
        safe = f"{ascii_title}-{label}.{file_ext}"
        utf8_name = f"{title_part}-{label}.{file_ext}"
        encoded_star = quote(utf8_name, safe="")
        media = media_type_for_path(out)

        if request_id:
            DOWNLOAD_PROGRESS[request_id] = {
                "state": "completed",
                "percent": 100,
                "updatedAt": time.time(),
            }

        return FileResponse(
            path=str(out),
            media_type=media,
            filename=safe,
            headers={
                "Content-Disposition": f'attachment; filename="{safe}"; filename*=UTF-8\'\'{encoded_star}',
                "Cache-Control": "no-store",
            },
            background=BackgroundTask(cleanup),
        )
    except Exception as e:
        err = str(e) or "Download failed."
        low = err.lower()
        needs_ff = "ffmpeg" in low or "ffprobe" in low
        if request_id:
            DOWNLOAD_PROGRESS[request_id] = {
                "state": "failed",
                "error": err,
                "updatedAt": time.time(),
            }
        cleanup()
        body: dict[str, Any] = {"error": err}
        if needs_ff:
            body["hint"] = ffmpeg_install_hint()
        return JSONResponse(body, status_code=500)


@app.get("/api/download-status")
def download_status(request_id: str = Query("", alias="request_id")) -> Any:
    cleanup_download_progress()
    if not request_id:
        return JSONResponse({"error": "request_id is required"}, status_code=400)
    st = DOWNLOAD_PROGRESS.get(request_id)
    if not st:
        return {"state": "preparing"}
    out = {k: v for k, v in st.items() if k != "updatedAt"}
    return out
