import subprocess, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))
from video_processor import FFMPEG, ENCODE_OPTS, OUTPUT_FOLDER, TEMP_FOLDER, FONT

inp    = os.path.join(OUTPUT_FOLDER, "merged.mp4")
out    = os.path.join(OUTPUT_FOLDER, "test_overlay_direct.mp4")
script = os.path.join(TEMP_FOLDER, "vf_script.txt")

print("FONT repr:", repr(FONT))

# Read what's in the script file
with open(script, "rb") as f:
    raw = f.read()
print("Script bytes (first 100):", raw[:100])
print()

cmd = [FFMPEG, "-i", inp, "-filter_script:v", script,
       *ENCODE_OPTS, "-c:a", "copy", "-t", "3", "-y", out]

r = subprocess.run(cmd, capture_output=True, text=True)
print("returncode:", r.returncode)
print("STDERR (last 800):")
print(r.stderr[-800:])
print()
print("Output size:", os.path.getsize(out) if os.path.exists(out) else "NOT FOUND")
