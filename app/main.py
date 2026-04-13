# app/main.py
import os
import sys
import shutil
import json
import traceback
import threading
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pipeline import run_pipeline, progress

app = FastAPI(title="FlawlessCut API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT             = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_FOLDER       = os.path.join(ROOT, "assets", "raw")
PROCESSED_FOLDER = os.path.join(ROOT, "assets", "processed")
MUSIC_FOLDER     = os.path.join(ROOT, "assets", "music")
OUTPUT_FOLDER    = os.path.join(ROOT, "assets", "output")
TEMPLATE_FILE    = os.path.join(ROOT, "templates", "study_vlog.json")

# Job state shared between /generate and /progress
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
    }


@app.post("/generate")
async def generate_vlog(
    clips:        List[UploadFile] = File(...),
    music:        Optional[UploadFile] = File(default=None),
    title:        str   = Form(...),
    author:       str   = Form(...),
    date:         str   = Form(...),
    volume:       float = Form(0.15),
    clip_volume:  float = Form(1.0),
    fade:         float = Form(1.0),
    global_audio: bool  = Form(True),
    clip_data:    str   = Form("[]"),
    clip_order:   str   = Form("[]"),
):
    # Block if already running
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

    # 3 — Save or clear music
    for f in os.listdir(MUSIC_FOLDER):
        os.remove(os.path.join(MUSIC_FOLDER, f))

    if music and music.filename:
        ext = os.path.splitext(music.filename)[1].lower()
        music_dest = os.path.join(MUSIC_FOLDER, f"background{ext}")
        with open(music_dest, "wb") as f:
            shutil.copyfileobj(music.file, f)
        music_filename = os.path.basename(music_dest)
    else:
        music_filename = "background.mp3"  # won't exist, pipeline will skip

    # 4 — Parse per-clip JSON
    try:
        parsed_clip_data  = json.loads(clip_data)
        parsed_clip_order = json.loads(clip_order)
    except Exception:
        parsed_clip_data  = []
        parsed_clip_order = []

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

    # 6 — Reset job state and launch pipeline in background thread
    job["running"] = True
    job["done"]    = False
    job["error"]   = None
    job["output"]  = None
    progress["step"] = "Starting"
    progress["pct"]  = 0

    def _run():
        try:
            output_name = run_pipeline(
                template_filename="study_vlog.json",
                clip_order=parsed_clip_order or None,
                clip_data=parsed_clip_data or None,
                clip_audio=clip_audio or None,
                global_audio=global_audio,
                clip_volume=clip_volume
            )
            job["output"] = output_name
            job["done"]   = True
        except Exception:
            job["error"] = traceback.format_exc()
            progress["step"] = "Error"
        finally:
            job["running"] = False

    threading.Thread(target=_run, daemon=True).start()

    # Return immediately — frontend polls /progress
    return JSONResponse({"status": "started"})


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
