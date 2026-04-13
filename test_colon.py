import subprocess, os

FFMPEG = r"C:\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
inp    = r"E:\02_Dev_Space\01_Projects\FlawlessCut\assets\output\merged.mp4"
script = r"E:\02_Dev_Space\01_Projects\FlawlessCut\temp\colon_test.txt"
out    = r"E:\02_Dev_Space\01_Projects\FlawlessCut\assets\output\test_colon.mp4"
font   = "C\\:/Windows/Fonts/arial.ttf"

tests = [
    ("colon escaped in text",
     f"drawtext=fontfile='{font}':text='9\\:00 AM':fontcolor=white:fontsize=38:x=100:y=100"),
    ("colon not escaped",
     f"drawtext=fontfile='{font}':text='9:00 AM':fontcolor=white:fontsize=38:x=100:y=100"),
    ("no colon",
     f"drawtext=fontfile='{font}':text='9-00 AM':fontcolor=white:fontsize=38:x=100:y=100"),
    ("three drawtext with colon",
     f"drawtext=fontfile='{font}':text='Title':fontcolor=white:fontsize=55:x=100:y=50:enable='between(t,0,8)',"
     f"drawtext=fontfile='{font}':text='DSA':fontcolor=yellow:fontsize=38:x=50:y=900:enable='between(t,0,8)',"
     f"drawtext=fontfile='{font}':text='9\\:00 AM':fontcolor=white:fontsize=38:x=1700:y=900:enable='between(t,0,8)'"),
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
    print(f"[{label}] size={size} rc={r.returncode} {kbps[-1].strip() if kbps else 'NO KBPS'}")
