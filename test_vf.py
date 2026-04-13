import subprocess, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))
from video_processor import esc, FONT, get_duration, PROCESSED_FOLDER, OUTPUT_FOLDER, FFMPEG, ENCODE_OPTS

ordered = ["avalon good export.mp4", "Comp 1.mp4"]
clip_durations = [get_duration(os.path.join(PROCESSED_FOLDER, n)) for n in ordered]
total_dur = sum(clip_durations)
data_map = {"avalon good export.mp4": {"subject": "DSA", "time": "9-00 AM"}}

parts = []
t = 0.0
for name, dur in zip(ordered, clip_durations):
    s, e   = t, t + dur
    item   = data_map.get(name, {})
    ttl    = esc("My Vlog")
    subj   = esc(item.get("subject", ""))
    time_t = esc(item.get("time", ""))
    parts.append(f"drawtext=fontfile='{FONT}':text='{ttl}':fontcolor=white:fontsize=55:x=(w-text_w)/2:y=35:enable='between(t,{s:.3f},{e:.3f})'")
    if subj:
        parts.append(f"drawtext=fontfile='{FONT}':text='{subj}':fontcolor=yellow:fontsize=38:x=35:y=h-th-35:enable='between(t,{s:.3f},{e:.3f})'")
    if time_t:
        parts.append(f"drawtext=fontfile='{FONT}':text='{time_t}':fontcolor=white:fontsize=38:x=w-tw-35:y=h-th-35:enable='between(t,{s:.3f},{e:.3f})'")
    t += dur

parts.append(f"fade=t=in:st=0:d=0.5")
parts.append(f"fade=t=out:st={total_dur-0.5:.3f}:d=0.5")

vf = ",".join(parts)
print("VF string:")
print(vf)
print()
print("FONT repr:", repr(FONT))

inp = os.path.join(OUTPUT_FOLDER, "merged.mp4")
out = os.path.join(OUTPUT_FOLDER, "test_vf_direct.mp4")

r = subprocess.run([FFMPEG, "-i", inp, "-vf", vf, *ENCODE_OPTS, "-c:a", "copy", "-t", "5", "-y", out],
                   capture_output=True, text=True)
print("returncode:", r.returncode)
for line in r.stderr.split("\n"):
    if any(k in line for k in ["Error", "kb/s:", "skip:", "No option", "Invalid"]):
        print(line)
print("size:", os.path.getsize(out) if os.path.exists(out) else "NOT FOUND")
