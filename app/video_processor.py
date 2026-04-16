# app/video_processor.py
import subprocess
import os
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image, ImageDraw, ImageFont

ROOT             = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_FOLDER       = os.path.join(ROOT, "assets", "raw")
PROCESSED_FOLDER = os.path.join(ROOT, "assets", "processed")
MUSIC_FOLDER     = os.path.join(ROOT, "assets", "music")
OUTPUT_FOLDER    = os.path.join(ROOT, "assets", "output")
TEMP_FOLDER      = os.path.join(ROOT, "temp")

FFMPEG  = r"C:\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
FFPROBE = r"C:\ffmpeg-8.1-essentials_build\bin\ffprobe.exe"

TARGET_W, TARGET_H, TARGET_FPS = 1920, 1080, 30
ENCODE_OPTS = ["-c:v", "libx264", "-crf", "23", "-preset", "ultrafast", "-pix_fmt", "yuv420p"]


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


def _esc(t):
    """Safe escape for ffmpeg drawtext."""
    return str(t).replace("'", "").replace(":", "\\:")


# ─── 1. NORMALIZE (parallel, with trim + overlay) ────────────────────────────

def normalize_video(input_path, output_path, keep_audio=True,
                    subject="", time_text="",
                    trim_start="", trim_end=""):
    FONT = r"C\:/Windows/Fonts/arial.ttf"

    vf = (f"scale={TARGET_W}:{TARGET_H}:force_original_aspect_ratio=decrease,"
          f"pad={TARGET_W}:{TARGET_H}:(ow-iw)/2:(oh-ih)/2:black")

    if subject:
        vf += (f",drawtext=fontfile='{FONT}':text='{_esc(subject)}':"
               f"fontcolor=yellow:fontsize=48:x=60:y=h-text_h-60:"
               f"shadowcolor=black@0.9:shadowx=3:shadowy=3")
    if time_text:
        vf += (f",drawtext=fontfile='{FONT}':text='{_esc(time_text)}':"
               f"fontcolor=white:fontsize=48:x=w-text_w-60:y=h-text_h-60:"
               f"shadowcolor=black@0.9:shadowx=3:shadowy=3")

    # trim flags AFTER -i so timestamps are accurate (before -i causes broken seek)
    cmd = [FFMPEG, "-i", input_path]
    if trim_start:
        cmd += ["-ss", trim_start]
    if trim_end:
        cmd += ["-to", trim_end]
    if trim_start or trim_end:
        cmd += ["-avoid_negative_ts", "make_zero"]

    if keep_audio:
        cmd += ["-vf", vf, "-r", str(TARGET_FPS), *ENCODE_OPTS, *audio_opts, "-y", output_path]
    else:
        # Mix silent audio source with video
        cmd = [FFMPEG, "-i", input_path, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]
        if trim_start:
            cmd += ["-ss", trim_start]
        if trim_end:
            cmd += ["-to", trim_end]
        cmd += ["-vf", vf, "-r", str(TARGET_FPS), *ENCODE_OPTS,
                "-c:a", "aac", "-ar", "44100", "-ac", "2", "-shortest", "-y", output_path]

    r = _run(cmd)
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
        cd   = data_map.get(filename, {})
        return normalize_video(
            inp, out,
            keep_audio  = keep,
            subject     = cd.get("subject", ""),
            time_text   = cd.get("time", ""),
            trim_start  = cd.get("trim_start", ""),
            trim_end    = cd.get("trim_end", "")
        ), filename

    print(f"[Normalize] {len(ordered)} clip(s) in parallel...")
    with ThreadPoolExecutor() as ex:
        for ok, name in [f.result() for f in as_completed(ex.submit(_one, f) for f in ordered)]:
            if not ok:
                raise RuntimeError(f"Normalization failed: {name}")
    print("[Normalize] Done.")


# ─── 2. MERGE (stream copy) ───────────────────────────────────────────────────

def _concat_clips(clip_paths, output_path):
    """Concat clips and reset timestamps so players seek correctly."""
    if len(clip_paths) == 1:
        shutil.copy(clip_paths[0], output_path)
        return True
    concat_path = os.path.join(TEMP_FOLDER, f"concat_{os.path.basename(output_path)}.txt")
    with open(concat_path, "w") as f:
        for p in clip_paths:
            f.write(f"file '{p}'\n")
    # Stream copy — fast, no re-encode. All clips have audio now (silent if muted).
    r = _run([FFMPEG, "-f", "concat", "-safe", "0", "-i", concat_path,
              "-c", "copy", "-reset_timestamps", "1", "-y", output_path])
    if r.returncode != 0:
        print(f"[ERROR] concat: {r.stderr[-300:]}")
        return False
    return True


def merge_videos(output_filename="merged.mp4", groups=None):
    """
    If groups provided: merge each group's clips together first,
    then concat all groups in order with a 0.5s fade between them.
    If no groups: simple concat in clip_order.txt order.
    """
    order_file = os.path.join(TEMP_FOLDER, "clip_order.txt")
    if os.path.exists(order_file):
        with open(order_file) as f:
            all_ordered = [l.strip() for l in f if l.strip()]
        all_ordered = [n for n in all_ordered if os.path.exists(os.path.join(PROCESSED_FOLDER, n))]
    else:
        all_ordered = sorted(f for f in os.listdir(PROCESSED_FOLDER) if f.endswith(".mp4"))

    if not all_ordered:
        raise RuntimeError("No processed clips to merge.")

    output_path = os.path.join(OUTPUT_FOLDER, output_filename)

    if not groups:
        # Simple merge — no groups
        return _concat_clips([os.path.join(PROCESSED_FOLDER, n) for n in all_ordered], output_path)

    # Group-aware merge
    # Build a map: clip_stem -> processed path
    stem_to_path = {n: os.path.join(PROCESSED_FOLDER, n) for n in all_ordered}

    # For each group, merge its clips into a single temp file
    group_outputs = []
    for g in groups:
        g_clips = [os.path.splitext(c)[0] + ".mp4" for c in g["clips"]]
        g_paths = [stem_to_path[c] for c in g_clips if c in stem_to_path]
        if not g_paths:
            continue
        g_out = os.path.join(TEMP_FOLDER, f"group_{g['group_id']}.mp4")
        if not _concat_clips(g_paths, g_out):
            raise RuntimeError(f"Failed merging group {g['group_id']}")
        group_outputs.append(g_out)

    # Clips not in any group — add them in order
    grouped_stems = set()
    for g in groups:
        for c in g["clips"]:
            grouped_stems.add(os.path.splitext(c)[0] + ".mp4")

    # Build final order: interleave groups and ungrouped clips
    # following the original clip_order
    final_segments = []
    used_groups = {}  # group_id -> output path, track if already added
    for g in groups:
        used_groups[g["group_id"]] = {"out": os.path.join(TEMP_FOLDER, f"group_{g['group_id']}.mp4"), "added": False}

    for stem in all_ordered:
        # Find which group this stem belongs to
        found_group = None
        for g in groups:
            g_stems = [os.path.splitext(c)[0] + ".mp4" for c in g["clips"]]
            if stem in g_stems:
                found_group = g["group_id"]
                break
        if found_group:
            if not used_groups[found_group]["added"]:
                final_segments.append(used_groups[found_group]["out"])
                used_groups[found_group]["added"] = True
        else:
            final_segments.append(stem_to_path[stem])

    if not final_segments:
        raise RuntimeError("No segments to merge.")

    return _concat_clips(final_segments, output_path)


# ─── 3. BACKGROUND MUSIC ─────────────────────────────────────────────────────

import math

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

    if os.path.splitext(music_filename)[1].lower() in (".mp4", ".mov", ".avi", ".mkv", ".webm"):
        extracted = os.path.join(MUSIC_FOLDER, "bg_extracted.aac")
        _run([FFMPEG, "-i", music_path, "-vn", "-c:a", "aac", "-y", extracted])
        music_path = extracted

    vid_dur = get_duration(input_path)
    music_dur = get_duration(music_path)
    fade_d = 3.0

    cmd_inputs = [FFMPEG, "-i", input_path]
    fc_parts = []
    
    # Check if we need to loop the music using crossfade
    if vid_dur > music_dur and music_dur > fade_d * 2:
        effective_loop_dur = music_dur - fade_d
        required_loops = math.ceil((vid_dur - music_dur) / effective_loop_dur) + 1
        if required_loops > 20: required_loops = 20
        
        for _ in range(required_loops):
            cmd_inputs.extend(["-i", music_path])
            
        last_out = "1:a"
        for i in range(1, required_loops):
            current_in = f"{i+1}:a"
            out_name = f"xf{i}"
            fc_parts.append(f"[{last_out}][{current_in}]acrossfade=d={fade_d}:c1=tri:c2=tri[{out_name}]")
            last_out = out_name
            
        # Add initial fade-in and strict trimming to the final crossfaded track
        fc_parts.append(f"[{last_out}]afade=t=in:st=0:d={fade_d},atrim=duration={vid_dur:.3f},volume={music_volume}[bg]")
    else:
        cmd_inputs.extend(["-i", music_path])
        fc_parts.append(f"[1:a]afade=t=in:st=0:d={fade_d},apad,atrim=duration={vid_dur:.3f},volume={music_volume}[bg]")

    if has_audio(input_path):
        fc_parts.append(f"[0:a]volume={clip_volume}[orig]")
        fc_parts.append(f"[orig][bg]amix=inputs=2:duration=first[aout]")
        fc = ";".join(fc_parts)
    else:
        fc = ";".join(fc_parts) + ";[bg]copy[aout]"  # Just pass bg through if no orig audio
        # wait, copy filter does not exist for audio like this. We map [bg] directly.
        # But to keep mapping consistent:
        fc = fc.replace("[bg]", "[aout]")

    cmd_inputs.extend([
        "-filter_complex", fc,
        "-map", "0:v", "-map", "[aout]",
        "-c:v", "copy", "-c:a", "aac", "-ar", "44100",
        "-shortest", "-y", output_path
    ])

    r = _run(cmd_inputs)
    if r.returncode != 0:
        print(f"[ERROR] music: {r.stderr[-600:]}")
        return False
    print("[Music] Done using crossfaded loop logic.")
    return True


# ─── 4. INTRO + OUTRO + FINAL FADE ───────────────────────────────────────────

def generate_intro(title, date, author):
    output_path = os.path.join(TEMP_FOLDER, "intro.mp4")
    FONT      = r"C\:/Windows/Fonts/arial.ttf"
    FONT_BOLD = r"C\:/Windows/Fonts/arialbd.ttf"
    if not os.path.exists("C:/Windows/Fonts/arialbd.ttf"):
        FONT_BOLD = FONT

    vf = (
        f"drawtext=fontfile='{FONT_BOLD}':text='{_esc(title)}':fontcolor=white:fontsize=72:"
        f"x=(w-text_w)/2:y=(h-text_h)/2-60,"
        f"drawtext=fontfile='{FONT}':text='{_esc(date)}':fontcolor=#E8E8E8:fontsize=36:"
        f"x=(w-text_w)/2:y=(h-text_h)/2+20,"
        f"drawtext=fontfile='{FONT}':text='{_esc(author)}':fontcolor=#A0A0A0:fontsize=30:"
        f"x=(w-text_w)/2:y=(h-text_h)/2+70,"
        f"fade=t=in:st=0:d=0.8,fade=t=out:st=4.2:d=0.8"
    )
    r = _run([
        FFMPEG, "-f", "lavfi", "-i", "color=c=black:s=1920x1080:rate=30",
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-vf", vf, "-t", "5",
        *ENCODE_OPTS, "-c:a", "aac", "-ar", "44100", "-ac", "2", "-y", output_path
    ])
    if r.returncode != 0:
        print(f"[ERROR] intro: {r.stderr[-400:]}")
        return False
    return True


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

    def _make_outro():
        return _run([
            FFMPEG, "-f", "lavfi", "-i", "color=c=black:size=1920x1080:rate=30",
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
            "-vf", (f"drawtext=fontfile='{FONT}':text='Thanks for watching!':"
                    f"fontcolor=white:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2"),
            "-t", "2", *ENCODE_OPTS, "-c:a", "aac", "-ar", "44100", "-ac", "2", "-y", outro_path
        ])

    print("[Intro/Outro] Generating in parallel...")
    with ThreadPoolExecutor(max_workers=2) as ex:
        fi = ex.submit(generate_intro, title, date, author)
        fo = ex.submit(_make_outro)
        intro_ok = fi.result()
        ro       = fo.result()

    if not intro_ok:
        print("[ERROR] intro failed.")
        return False
    if ro.returncode != 0:
        print(f"[ERROR] outro: {ro.stderr[-300:]}")
        return False

    main_dur  = get_duration(input_path)
    total_dur = 5 + main_dur + 2
    fade_out  = total_dur - fade_duration

    with open(concat_path, "w") as f:
        f.write(f"file '{intro_path}'\nfile '{input_path}'\nfile '{outro_path}'\n")

    r = _run([
        FFMPEG, "-f", "concat", "-safe", "0", "-i", concat_path,
        "-vf", f"fade=t=in:st=0:d={fade_duration},fade=t=out:st={fade_out:.3f}:d={fade_duration}",
        "-af", f"afade=t=in:st=0:d={fade_duration},afade=t=out:st={fade_out:.3f}:d={fade_duration}",
        "-reset_timestamps", "1",
        *ENCODE_OPTS, "-c:a", "aac", "-ar", "44100", "-y", output_path
    ])
    if r.returncode != 0:
        print(f"[ERROR] final: {r.stderr[-400:]}")
        return False

    print(f"[Final] Done -> {output_path}")
    return True


# ─── 5. VOICEOVER MIXING ─────────────────────────────────────────────────────

def mix_voiceovers(input_path, output_path, voices):
    """
    voices: list of {path, start, volume, trim_start, trim_end}
    Overlays each voice recording at the given start time over the video.
    """
    if not voices:
        shutil.copy(input_path, output_path)
        return True

    # Convert each webm/ogg voice to aac first so FFmpeg can decode reliably
    converted = [None] * len(voices)

    def _convert_voice(i, v):
        conv_path = os.path.join(TEMP_FOLDER, f"voice_conv_{i}.aac")
        trim_args = []
        if v.get("trim_start", 0) > 0:
            trim_args += ["-ss", str(v["trim_start"])]
        if v.get("trim_end", 0) > 0:
            trim_args += ["-to", str(v["trim_end"])]
        r = _run([FFMPEG, "-y"] + trim_args + ["-i", v["path"], "-vn", "-c:a", "aac", "-ar", "44100", "-ac", "2", conv_path])
        return r.returncode == 0, i, conv_path, r.stderr

    with ThreadPoolExecutor() as ex:
        futs = [ex.submit(_convert_voice, i, v) for i, v in enumerate(voices)]
        for fut in as_completed(futs):
            ok, i, conv_path, stderr = fut.result()
            if not ok:
                print(f"[ERROR] voice convert {i}: {stderr[-300:]}")
                return False
            converted[i] = {**voices[i], "path": conv_path}

    cmd = [FFMPEG, "-i", input_path]
    for v in converted:
        cmd += ["-i", v["path"]]

    fc_parts = []
    video_has_audio = has_audio(input_path)

    # Delay each voice to its start time (ms)
    for i, v in enumerate(converted):
        delay_ms = int(float(v.get("start", 0)) * 1000)
        vol = v.get("volume", 1.0)
        fc_parts.append(f"[{i+1}:a]adelay={delay_ms}|{delay_ms},volume={vol}[v{i}]")

    if video_has_audio:
        mix_inputs = "[0:a]" + "".join(f"[v{i}]" for i in range(len(converted)))
        fc_parts.append(f"{mix_inputs}amix=inputs={len(converted)+1}:duration=first:dropout_transition=0[aout]")
    else:
        # No original audio — just mix the voices together
        if len(converted) == 1:
            fc_parts.append(f"[v0]apad[aout]")
        else:
            mix_inputs = "".join(f"[v{i}]" for i in range(len(converted)))
            fc_parts.append(f"{mix_inputs}amix=inputs={len(converted)}:duration=longest:dropout_transition=0[aout]")

    cmd += [
        "-filter_complex", ";".join(fc_parts),
        "-map", "0:v", "-map", "[aout]",
        "-c:v", "copy", "-c:a", "aac", "-ar", "44100", "-y", output_path
    ]

    r = _run(cmd)
    if r.returncode != 0:
        print(f"[ERROR] voiceover: {r.stderr[-600:]}")
        return False
    print(f"[Voiceover] Mixed {len(converted)} track(s).")
    return True


# ─── 6. THUMBNAIL ────────────────────────────────────────────────────────────

def generate_thumbnail(title, day, template_path, output_path):
    try:
        img  = Image.open(template_path).convert("RGBA")
        draw = ImageDraw.Draw(img)
        font_path = os.path.join(ROOT, "assets", "fonts", "aileron", "Aileron-Bold.otf")
        if not os.path.exists(font_path):
            font_path = "arial.ttf"
        try:
            title_font = ImageFont.truetype(font_path, 118)
            day_font   = ImageFont.truetype(font_path, 20)
        except Exception:
            title_font = ImageFont.load_default()
            day_font   = ImageFont.load_default()
        draw.text((60, 60), day, font=day_font, fill="white")
        bbox   = draw.textbbox((0, 0), title, font=title_font)
        x = (img.width  - (bbox[2]-bbox[0])) / 2
        y = (img.height - (bbox[3]-bbox[1])) / 2 - bbox[1]
        draw.text((x, y), title, font=title_font, fill="white")
        img.convert("RGB").save(output_path, quality=95)
        print(f"[Thumbnail] -> {output_path}")
        return True
    except Exception as e:
        print(f"[ERROR] Thumbnail: {e}")
        return False
