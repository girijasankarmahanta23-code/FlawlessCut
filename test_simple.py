import sys, os, subprocess
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))
from video_processor import FFMPEG, ENCODE_OPTS, has_audio, OUTPUT_FOLDER, FONT, esc

inp = os.path.join(OUTPUT_FOLDER, "merged.mp4")
out = os.path.join(OUTPUT_FOLDER, "test_simple3.mp4")

print("has_audio:", has_audio(inp))

# Simplest possible vf - just fade
vf = "fade=t=in:st=0:d=0.5"
cmd = [FFMPEG, "-i", inp, "-vf", vf, *ENCODE_OPTS, "-an", "-y", out]
r = subprocess.run(cmd, capture_output=True, text=True)
size = os.path.getsize(out) if os.path.exists(out) else 0
print(f"simple fade: size={size} rc={r.returncode}")
