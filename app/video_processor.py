# app/video_processor.py
import subprocess
import os
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT             = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_FOLDER       = os.path.join(ROOT, "assets", "raw")
PROCESSED_FOLDER = os.path.join(ROOT, "assets", "processed")
MUSIC_FOLDER     = os.path.join(ROOT, "assets", "music")
OUTPUT_FOLDER    = os.path.join(ROOT, "assets", "output")
TEMP_FOLDER      = os.path.join(ROOT, "temp")

FFMPEG  = r"C:\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
FFPROBE = r"C:\ffmpeg-8.1-essentials_build\bin\ffprobe.exe"

TARGET_W, TARGET_H, TARGET_FPS = 1920, 1080, 30
ENCODE_OPTS = ["-c:v", "libx264", "-crf", "23", "-preset", "ultrafast"]


def _run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def get_duration(path):
    r = _run([FFPROBE, "-v", "error", "-show_entries", "format=duration",
              "-of", "default=noprint_wrappers=1:nokey=1", path])
    return float(r.stdout.strip()) if r.returncode == 0 else 0.0


def has_audio(path):
    r = _run([FFPROBE, "-v", "error", "-select_streams", "a",
              "-show_entries", "stream=codec_type",
              "-of", "default=noprint_wrappers=1:nokey=1", path])
    return "audio" in r.stdout


# ─── 1. NORMALIZE (parallel) ─────────────────────────────────────────────────

def normalize_video(input_path, output_path, keep_audio=True, subject="", time=""):
    audio_opts = ["-c:a", "aac", "-ar", "44100", "-ac", "2"] if keep_audio else ["-an"]
    
    FONT = r"C\:/Windows/Fonts/arial.ttf"
    vf_str = f"scale={TARGET_W}:{TARGET_H}:force_original_aspect_ratio=decrease,pad={TARGET_W}:{TARGET_H}:(ow-iw)/2:(oh-ih)/2:black"
    
    if subject:
        vf_str += f",drawtext=fontfile='{FONT}':text='{subject}':fontcolor=yellow:fontsize=48:x=60:y=h-text_h-60:shadowcolor=black@0.9:shadowx=3:shadowy=3"
    if time:
        vf_str += f",drawtext=fontfile='{FONT}':text='{time}':fontcolor=white:fontsize=48:x=w-text_w-60:y=h-text_h-60:shadowcolor=black@0.9:shadowx=3:shadowy=3"

    r = _run([
        FFMPEG, "-i", input_path,
        "-vf", vf_str,
        "-r", str(TARGET_FPS), *ENCODE_OPTS, *audio_opts, "-y", output_path
    ])
    if r.returncode != 0:
        print(f"[ERROR] normalize: {r.stderr[-300:]}")
        return False
    print(f"[Normalized] {os.path.basename(input_path)}")
    return True


def normalize_all(clip_order=None, clip_data=None, clip_audio=None):
    raw_files = [f for f in os.listdir(RAW_FOLDER)
                 if f.lower().endswith((".mp4", ".mov", ".avi", ".mkv", ".webm"))]
    if not raw_files:
        raise RuntimeError("No video files found in assets/raw/")

    if clip_order:
        ordered = [f for f in clip_order if f in raw_files]
        ordered += [f for f in sorted(raw_files) if f not in ordered]
    else:
        ordered = sorted(raw_files)

    data_map = {item["clip"]: item for item in (clip_data or [])}

    with open(os.path.join(TEMP_FOLDER, "clip_order.txt"), "w") as f:
        for name in ordered:
            f.write(os.path.splitext(name)[0] + ".mp4\n")

    def _one(filename):
        inp  = os.path.join(RAW_FOLDER, filename)
        out  = os.path.join(PROCESSED_FOLDER, os.path.splitext(filename)[0] + ".mp4")
        keep = (clip_audio or {}).get(filename, True)
        
        cdata = data_map.get(filename, {})
        subj  = cdata.get("subject", "")
        ctime = cdata.get("time", "")
        
        return normalize_video(inp, out, keep_audio=keep, subject=subj, time=ctime), filename

    print(f"[Normalize] {len(ordered)} clip(s) in parallel...")
    with ThreadPoolExecutor() as ex:
        for ok, name in [f.result() for f in as_completed(ex.submit(_one, f) for f in ordered)]:
            if not ok:
                raise RuntimeError(f"Normalization failed: {name}")
    print("[Normalize] Done.")


# ─── 2. MERGE (stream copy) ───────────────────────────────────────────────────

def merge_videos(output_filename="merged.mp4"):
    order_file = os.path.join(TEMP_FOLDER, "clip_order.txt")
    if os.path.exists(order_file):
        with open(order_file) as f:
            ordered = [l.strip() for l in f if l.strip()]
        ordered = [n for n in ordered if os.path.exists(os.path.join(PROCESSED_FOLDER, n))]
    else:
        ordered = sorted(f for f in os.listdir(PROCESSED_FOLDER) if f.endswith(".mp4"))

    if not ordered:
        raise RuntimeError("No processed clips to merge.")

    output_path = os.path.join(OUTPUT_FOLDER, output_filename)

    if len(ordered) == 1:
        shutil.copy(os.path.join(PROCESSED_FOLDER, ordered[0]), output_path)
        print("[Merge] Single clip copied.")
        return True

    concat_path = os.path.join(TEMP_FOLDER, "concat_list.txt")
    with open(concat_path, "w") as f:
        for name in ordered:
            f.write(f"file '{os.path.join(PROCESSED_FOLDER, name)}'\n")

    r = _run([FFMPEG, "-f", "concat", "-safe", "0", "-i", concat_path,
              "-c", "copy", "-y", output_path])
    if r.returncode != 0:
        print(f"[ERROR] merge: {r.stderr[-300:]}")
        return False
    print("[Merge] Done.")
    return True


# ─── 3. BACKGROUND MUSIC ─────────────────────────────────────────────────────

def mix_music(
    input_filename="merged.mp4",
    output_filename="merged_music.mp4",
    music_filename="background.mp3",
    music_volume=0.15,
    clip_volume=1.0
):
    input_path  = os.path.join(OUTPUT_FOLDER, input_filename)
    music_path  = os.path.join(MUSIC_FOLDER, music_filename)
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)

    if not os.path.exists(music_path):
        shutil.copy(input_path, output_path)
        print("[Music] No music file, skipping.")
        return True

    # Extract audio if music source is a video
    if os.path.splitext(music_filename)[1].lower() in (".mp4", ".mov", ".avi", ".mkv", ".webm"):
        extracted = os.path.join(MUSIC_FOLDER, "bg_extracted.aac")
        _run([FFMPEG, "-i", music_path, "-vn", "-c:a", "aac", "-y", extracted])
        music_path = extracted

    vid_dur = get_duration(input_path)

    if has_audio(input_path):
        fc = (f"[0:a]volume={clip_volume}[orig];"
              f"[1:a]apad,atrim=duration={vid_dur:.3f},volume={music_volume}[bg];"
              f"[orig][bg]amix=inputs=2:duration=first[aout]")
        audio_map = "[aout]"
    else:
        fc = f"[1:a]apad,atrim=duration={vid_dur:.3f},volume={music_volume}[aout]"
        audio_map = "[aout]"

    r = _run([
        FFMPEG, "-i", input_path, "-i", music_path,
        "-filter_complex", fc,
        "-map", "0:v", "-map", audio_map,
        "-c:v", "copy", "-c:a", "aac", "-ar", "44100",
        "-shortest", "-y", output_path
    ])
    if r.returncode != 0:
        print(f"[ERROR] music: {r.stderr[-600:]}")
        return False
    print("[Music] Done.")
    return True


# ─── 4. INTRO + OUTRO + FINAL FADE ───────────────────────────────────────────

def add_intro_outro_and_fade(
    input_filename="merged_music.mp4",
    output_filename="final_vlog.mp4",
    title="My Vlog", date="", author="",
    fade_duration=1.0
):
    input_path  = os.path.join(OUTPUT_FOLDER, input_filename)
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)
    intro_path  = os.path.join(TEMP_FOLDER, "intro.mp4")
    outro_path  = os.path.join(TEMP_FOLDER, "outro.mp4")
    concat_path = os.path.join(TEMP_FOLDER, "final_list.txt")

    FONT = r"C\:/Windows/Fonts/arial.ttf"

    def _make_intro():
        return _run([
            FFMPEG, "-f", "lavfi", "-i", "color=c=black:size=1920x1080:rate=30",
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
            "-vf", (
                f"drawtext=fontfile='{FONT}':text='{title}':fontcolor=white:fontsize=70:"
                f"x=(w-text_w)/2:y=(h-text_h)/2-60,"
                f"drawtext=fontfile='{FONT}':text='{date}':fontcolor=gray:fontsize=40:"
                f"x=(w-text_w)/2:y=(h-text_h)/2+20,"
                f"drawtext=fontfile='{FONT}':text='{author}':fontcolor=gray:fontsize=35:"
                f"x=(w-text_w)/2:y=(h-text_h)/2+80"
            ),
            "-t", "3", *ENCODE_OPTS, "-c:a", "aac", "-ar", "44100", "-ac", "2", "-y", intro_path
        ])

    def _make_outro():
        return _run([
            FFMPEG, "-f", "lavfi", "-i", "color=c=black:size=1920x1080:rate=30",
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
            "-vf", (
                f"drawtext=fontfile='{FONT}':text='Thanks for watching!':"
                f"fontcolor=white:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2"
            ),
            "-t", "2", *ENCODE_OPTS, "-c:a", "aac", "-ar", "44100", "-ac", "2", "-y", outro_path
        ])

    print("[Intro/Outro] Generating in parallel...")
    with ThreadPoolExecutor(max_workers=2) as ex:
        ri = ex.submit(_make_intro).result()
        ro = ex.submit(_make_outro).result()

    if ri.returncode != 0:
        print(f"[ERROR] intro: {ri.stderr[-300:]}")
        return False
    if ro.returncode != 0:
        print(f"[ERROR] outro: {ro.stderr[-300:]}")
        return False

    main_dur  = get_duration(input_path)
    total_dur = 3 + main_dur + 2
    fade_out  = total_dur - fade_duration

    with open(concat_path, "w") as f:
        f.write(f"file '{intro_path}'\nfile '{input_path}'\nfile '{outro_path}'\n")

    r = _run([
        FFMPEG, "-f", "concat", "-safe", "0", "-i", concat_path,
        "-vf", f"fade=t=in:st=0:d={fade_duration},fade=t=out:st={fade_out:.3f}:d={fade_duration}",
        "-af", f"afade=t=in:st=0:d={fade_duration},afade=t=out:st={fade_out:.3f}:d={fade_duration}",
        *ENCODE_OPTS, "-c:a", "aac", "-ar", "44100", "-y", output_path
    ])
    if r.returncode != 0:
        print(f"[ERROR] final: {r.stderr[-400:]}")
        return False

    print(f"[Final] Done -> {output_path}")
    return True
