# app/main.py

import os
import sys
import shutil
import json
import traceback
import threading
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pipeline import run_pipeline, progress
from video_processor import generate_thumbnail
from youtube_service import youtube_service

app = FastAPI(title="FlawlessCut API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT             = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_FOLDER       = os.path.join(ROOT, "assets", "raw")
PROCESSED_FOLDER = os.path.join(ROOT, "assets", "processed")
MUSIC_FOLDER     = os.path.join(ROOT, "assets", "music")
OUTPUT_FOLDER    = os.path.join(ROOT, "assets", "output")
TEMPLATE_FILE    = os.path.join(ROOT, "templates", "study_vlog.json")

ACTIVITY_FILE = os.path.join(ROOT, "activity.json")

os.makedirs(MUSIC_FOLDER, exist_ok=True)
app.mount("/api/music/files", StaticFiles(directory=MUSIC_FOLDER), name="music_files")


def record_activity():
    """Record today's date as a work session in activity.json."""
    today = __import__('datetime').date.today().isoformat()
    data  = {}
    if os.path.exists(ACTIVITY_FILE):
        try:
            with open(ACTIVITY_FILE) as f:
                data = json.load(f)
        except Exception:
            data = {}
    data[today] = data.get(today, 0) + 1
    with open(ACTIVITY_FILE, "w") as f:
        json.dump(data, f, indent=2)


@app.get("/activity")
def get_activity():
    """Return all recorded work days for the contribution graph."""
    if not os.path.exists(ACTIVITY_FILE):
        return []
    try:
        with open(ACTIVITY_FILE) as f:
            data = json.load(f)
        result = []
        for date, count in data.items():
            level = 1 if count == 1 else 2 if count == 2 else 3 if count <= 4 else 4
            result.append({"date": date, "count": count, "level": level})
        return result
    except Exception:
        return []


job = {"running": False, "done": False, "error": None, "output": None}


@app.get("/")
def root():
    return {"status": "FlawlessCut API is running"}


@app.get("/progress")
def get_progress():
    return {
        "step":    progress["step"],
        "pct":     progress["pct"],
        "running": job["running"],
        "done":    job["done"],
        "error":   job["error"],
        "output":  job["output"],
        "youtube_url": job.get("youtube_url"),
        "youtube_error": job.get("youtube_error"),
    }


@app.post("/generate")
async def generate_vlog(
    clips:        List[UploadFile] = File(...),
    music:        Optional[UploadFile] = File(default=None),
    voices:       List[UploadFile] = File(default=[]),
    voice_data:   str   = Form("[]"),
    title:        str   = Form(...),
    author:       str   = Form(...),
    date:         str   = Form(...),
    volume:       float = Form(0.15),
    clip_volume:  float = Form(1.0),
    fade:         float = Form(1.0),
    global_audio: bool  = Form(True),
    clip_data:    str   = Form("[]"),
    clip_order:   str   = Form("[]"),
    groups:       str   = Form("[]"),
    # YouTube upload options
    upload_to_youtube: bool = Form(False),
    youtube_privacy:   str  = Form("private"),
    youtube_title:     str  = Form(""),
    youtube_description: str = Form(""),
    youtube_tags:      str  = Form("[]"),
):
    if job["running"]:
        return JSONResponse({"status": "error", "message": "A job is already running."}, status_code=409)

    # 1 — Clear old files
    for folder in [RAW_FOLDER, PROCESSED_FOLDER]:
        for f in os.listdir(folder):
            fp = os.path.join(folder, f)
            if os.path.isfile(fp):
                os.remove(fp)

    # 2 — Save clips
    for clip in clips:
        with open(os.path.join(RAW_FOLDER, clip.filename), "wb") as f:
            shutil.copyfileobj(clip.file, f)

    # 3 — Handle custom music without deleting the library
    custom_dest_file = "custom_vlog_track_upload.mp3"
    custom_dest_path = os.path.join(MUSIC_FOLDER, custom_dest_file)
    if os.path.exists(custom_dest_path):
        os.remove(custom_dest_path)

    if music and music.filename:
        # A custom file was uploaded
        ext = os.path.splitext(music.filename)[1].lower()
        music_dest = os.path.join(MUSIC_FOLDER, f"custom_vlog_track_upload{ext}")
        with open(music_dest, "wb") as f:
            shutil.copyfileobj(music.file, f)
        music_filename = os.path.basename(music_dest)
    else:
        music_filename = "background.mp3"  # default fallback if the system has one

    # 4 — Parse JSON fields
    try:
        parsed_clip_data  = json.loads(clip_data)
        parsed_clip_order = json.loads(clip_order)
        parsed_groups     = json.loads(groups)
        parsed_tags       = json.loads(youtube_tags) if youtube_tags else []
        parsed_voice_data = json.loads(voice_data) if voice_data else []
    except Exception:
        parsed_clip_data  = []
        parsed_clip_order = []
        parsed_groups     = []
        parsed_tags       = []
        parsed_voice_data = []

    # Save voiceover files
    VOICE_FOLDER = os.path.join(ROOT, "temp", "voices")
    os.makedirs(VOICE_FOLDER, exist_ok=True)
    # Clear old voices
    for f in os.listdir(VOICE_FOLDER):
        os.remove(os.path.join(VOICE_FOLDER, f))

    voice_list = []
    for i, vfile in enumerate(voices):
        ext  = os.path.splitext(vfile.filename)[1] or ".webm"
        dest = os.path.join(VOICE_FOLDER, f"voice_{i}{ext}")
        with open(dest, "wb") as f:
            shutil.copyfileobj(vfile.file, f)
        vd = parsed_voice_data[i] if i < len(parsed_voice_data) else {}
        voice_list.append({
            "path":       dest,
            "start":      vd.get("start", 0),
            "volume":     vd.get("volume", 1.0),
            "trim_start": vd.get("trimStart", 0),
            "trim_end":   vd.get("trimEnd", 0),
        })

    clip_audio = {item["clip"]: item.get("audio", True) for item in parsed_clip_data}

    # 5 — Update template
    with open(TEMPLATE_FILE, "r") as f:
        template = json.load(f)

    template["intro"]["title"]              = title
    template["intro"]["author"]             = author
    template["intro"]["date"]               = date
    template["music"]["filename"]           = music_filename
    template["music"]["volume"]             = volume
    template["transition"]["fade_duration"] = fade

    with open(TEMPLATE_FILE, "w") as f:
        json.dump(template, f, indent=2)

    # 6 — Launch pipeline in background thread
    job["running"] = True
    job["done"]    = False
    job["error"]   = None
    job["output"]  = None
    progress["step"] = "Starting"
    progress["pct"]  = 0

    def _run():
        try:
            output_name = run_pipeline(
                template_filename = "study_vlog.json",
                clip_order        = parsed_clip_order or None,
                clip_data         = parsed_clip_data  or None,
                clip_audio        = clip_audio        or None,
                global_audio      = global_audio,
                clip_volume       = clip_volume,
                groups            = parsed_groups     or None,
                voices            = voice_list        or None,
            )
            job["output"] = output_name
            record_activity()  # record this work session

            # YouTube upload if requested
            if upload_to_youtube:
                progress["step"] = "Uploading to YouTube"
                progress["pct"] = 90

                # Generate YouTube metadata
                youtube_metadata = youtube_service.generate_video_metadata(template, {
                    'title': title,
                    'author': author,
                    'date': date
                })

                # Override with user-provided metadata if specified
                if youtube_title:
                    youtube_metadata['title'] = youtube_title
                if youtube_description:
                    youtube_metadata['description'] = youtube_description
                if parsed_tags:
                    youtube_metadata['tags'] = parsed_tags

                # Upload video and thumbnail
                video_path = os.path.join(OUTPUT_FOLDER, output_name)
                thumbnail_path = os.path.join(OUTPUT_FOLDER, "thumbnail.jpg")

                video_id = youtube_service.upload_video(
                    video_path=video_path,
                    thumbnail_path=thumbnail_path if os.path.exists(thumbnail_path) else None,
                    title=youtube_metadata['title'],
                    description=youtube_metadata['description'],
                    tags=youtube_metadata['tags'],
                    privacy=youtube_privacy
                )

                if video_id:
                    job["youtube_url"] = f"https://www.youtube.com/watch?v={video_id}"
                    progress["step"] = "YouTube upload complete"
                    progress["pct"] = 95
                else:
                    job["youtube_error"] = "Failed to upload to YouTube"
                    progress["step"] = "YouTube upload failed"
                    progress["pct"] = 95

            job["done"]   = True
        except Exception:
            job["error"] = traceback.format_exc()
            progress["step"] = "Error"
        finally:
            job["running"] = False

    threading.Thread(target=_run, daemon=True).start()
    return JSONResponse({"status": "started"})


@app.post("/upload-clips")
async def upload_clips(files: List[UploadFile] = File(...)):
    """Used by group file picker to upload additional clips."""
    saved = []
    for file in files:
        dest = os.path.join(RAW_FOLDER, file.filename)
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        saved.append(file.filename)
    return {"uploaded": saved}


@app.get("/download")
def download_video():
    files = [
        f for f in os.listdir(OUTPUT_FOLDER)
        if f.endswith(".mp4") and not f.startswith("merged") and f != "merged.mp4"
    ]
    if not files:
        return JSONResponse({"error": "No output video found."}, status_code=404)
    latest = max(files, key=lambda f: os.path.getmtime(os.path.join(OUTPUT_FOLDER, f)))
    return FileResponse(os.path.join(OUTPUT_FOLDER, latest), media_type="video/mp4", filename=latest)


@app.post("/generate-thumbnail")
async def api_generate_thumbnail(
    title:      str                      = Form("PLACEMENT PREP"),
    day:        int                      = Form(1),
    background: Optional[UploadFile]     = File(default=None)
):
    template_path = os.path.join(ROOT, "assets", "thumbnail", "template.png")
    if background and background.filename:
        template_path = os.path.join(ROOT, "temp", f"custom_bg_temp{os.path.splitext(background.filename)[1]}")
        with open(template_path, "wb") as f:
            shutil.copyfileobj(background.file, f)

    output_path = os.path.join(OUTPUT_FOLDER, "thumbnail.jpg")
    success = generate_thumbnail(title, f"DAY {day}", template_path, output_path)
    if not success:
        return JSONResponse({"error": "Failed to generate thumbnail."}, status_code=500)
    return FileResponse(output_path, media_type="image/jpeg", filename="thumbnail.jpg")


# ── YouTube Integration ───────────────────────────────────────────────────────

@app.get("/youtube/auth")
def youtube_auth():
    """Check YouTube authentication status"""
    try:
        channel_info = youtube_service.get_channel_info()
        if channel_info:
            return {
                "authenticated": True,
                "channel_title": channel_info['snippet']['title'],
                "channel_id": channel_info['id'],
                "subscriber_count": channel_info['statistics'].get('subscriberCount', '0')
            }
        else:
            return {"authenticated": False, "error": "No channel found"}
    except Exception as e:
        return {"authenticated": False, "error": str(e)}


@app.post("/youtube/authenticate")
def youtube_authenticate():
    """Initiate YouTube OAuth flow"""
    try:
        success = youtube_service.authenticate()
        if success:
            channel_info = youtube_service.get_channel_info()
            return {
                "success": True,
                "channel_title": channel_info['snippet']['title'] if channel_info else "Unknown",
                "message": "YouTube authentication successful"
            }
        else:
            return JSONResponse({"success": False, "error": "Authentication failed"}, status_code=400)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@app.get("/youtube/status")
def youtube_status():
    """Get YouTube authentication and quota status"""
    try:
        channel_info = youtube_service.get_channel_info()
        return {
            "authenticated": bool(channel_info),
            "channel_info": channel_info,
            "ready_for_upload": bool(youtube_service.youtube)
        }
    except Exception as e:
        return {"authenticated": False, "error": str(e)}
