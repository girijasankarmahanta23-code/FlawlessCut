import subprocess, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))
from video_processor import FFMPEG, ENCODE_OPTS, OUTPUT_FOLDER, TEMP_FOLDER

inp    = os.path.join(OUTPUT_FOLDER, "merged.mp4")
out    = os.path.join(OUTPUT_FOLDER, "test_exact.mp4")
script = os.path.join(TEMP_FOLDER, "vf_script.txt")

with open(script, "rb") as f:
    raw = f.read()

print("Full script content:")
print(raw.decode("utf-8"))
print()
print("Raw bytes (first 200):", raw[:200])
print()

r = subprocess.run([
    FFMPEG, "-i", inp, "-filter_script:v", script,
    *ENCODE_OPTS, "-c:a", "copy", "-t", "5", "-y", out
], capture_output=True, text=True)

print("returncode:", r.returncode)
# Find the key error lines
for line in r.stderr.split("\n"):
    if any(k in line for k in ["Error", "kb/s:", "skip:", "No option"]):
        print(line)

print("Output size:", os.path.getsize(out) if os.path.exists(out) else "NOT FOUND")
