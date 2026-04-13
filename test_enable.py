import subprocess, os

FFMPEG = r"C:\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
inp    = r"E:\02_Dev_Space\01_Projects\FlawlessCut\assets\output\merged.mp4"
script = r"E:\02_Dev_Space\01_Projects\FlawlessCut\temp\enable_test.txt"
out    = r"E:\02_Dev_Space\01_Projects\FlawlessCut\assets\output\test_enable.mp4"

tests = [
    ("with quotes",    "drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='Hi':fontcolor=white:fontsize=60:x=100:y=100:enable='between(t,0,5)'"),
    ("no quotes",      "drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='Hi':fontcolor=white:fontsize=60:x=100:y=100:enable=between(t\\,0\\,5)"),
    ("no enable",      "drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='Hi':fontcolor=white:fontsize=60:x=100:y=100"),
]

for label, vf in tests:
    with open(script, "w", encoding="utf-8", newline="") as f:
        f.write(vf)
    r = subprocess.run([
        FFMPEG, "-i", inp, "-filter_script:v", script,
        "-c:v", "libx264", "-crf", "23", "-preset", "ultrafast",
        "-an", "-t", "3", "-y", out
    ], capture_output=True, text=True)
    size = os.path.getsize(out) if os.path.exists(out) else 0
    kbps = [l for l in r.stderr.split("\n") if "kb/s:" in l and "libx264" in l]
    print(f"[{label}] size={size} rc={r.returncode} {kbps[-1].strip() if kbps else ''}")
