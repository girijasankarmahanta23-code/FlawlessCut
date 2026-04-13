import subprocess, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))
from video_processor import FFMPEG, FFPROBE, OUTPUT_FOLDER, MUSIC_FOLDER, TEMP_FOLDER, ENCODE_OPTS

inp    = os.path.join(OUTPUT_FOLDER, "merged.mp4")
music  = os.path.join(MUSIC_FOLDER, "background.mp3")
script = os.path.join(TEMP_FOLDER, "fc_script.txt")
out    = os.path.join(OUTPUT_FOLDER, "test_direct.mp4")

# Print script content
with open(script, "rb") as f:
    content = f.read()
print("Script bytes (first 300):", content[:300])
print()

cmd = [
    FFMPEG, "-i", inp, "-i", music,
    "-filter_complex_script", script,
    "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-crf", "23", "-preset", "ultrafast",
    "-c:a", "aac", "-ar", "44100",
    "-shortest", "-t", "5", "-y", out
]

r = subprocess.run(cmd, capture_output=True, text=True)
print("returncode:", r.returncode)
print("FULL STDERR:")
print(r.stderr)
print()
print("Output size:", os.path.getsize(out) if os.path.exists(out) else "NOT FOUND")
