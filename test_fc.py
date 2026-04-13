import subprocess

FFMPEG = r"C:\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
script = r"E:\02_Dev_Space\01_Projects\FlawlessCut\temp\test_fc3.txt"
inp    = r"E:\02_Dev_Space\01_Projects\FlawlessCut\assets\output\merged.mp4"
music  = r"E:\02_Dev_Space\01_Projects\FlawlessCut\assets\music\background.mp3"
out    = r"E:\02_Dev_Space\01_Projects\FlawlessCut\assets\output\test_fade2.mp4"

with open(script, "w", encoding="utf-8", newline="") as f:
    f.write("[0:v]fade=t=in:st=0:d=0.5[vout];[1:a]apad,atrim=duration=5,volume=0.15[aout]")

r = subprocess.run([
    FFMPEG, "-i", inp, "-i", music,
    "-filter_complex_script", script,
    "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-crf", "23", "-preset", "ultrafast",
    "-c:a", "aac", "-t", "3", "-y", out
], capture_output=True, text=True)

print("returncode:", r.returncode)
print("stderr:", r.stderr[-500:])

import os
if os.path.exists(out):
    print("size:", os.path.getsize(out))
else:
    print("OUTPUT NOT CREATED")
