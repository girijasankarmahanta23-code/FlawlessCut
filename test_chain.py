import subprocess, os

FFMPEG = r"C:\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
inp    = r"E:\02_Dev_Space\01_Projects\FlawlessCut\assets\output\merged.mp4"
script = r"E:\02_Dev_Space\01_Projects\FlawlessCut\temp\chain_test.txt"
out    = r"E:\02_Dev_Space\01_Projects\FlawlessCut\assets\output\test_chain.mp4"

font = "C\\:/Windows/Fonts/arial.ttf"

tests = [
    ("two drawtext comma",
     f"drawtext=fontfile='{font}':text='Title':fontcolor=white:fontsize=55:x=100:y=50:enable='between(t,0,5)',"
     f"drawtext=fontfile='{font}':text='Subject':fontcolor=yellow:fontsize=38:x=50:y=900:enable='between(t,0,5)'"),

    ("two drawtext comma no enable quotes",
     f"drawtext=fontfile='{font}':text='Title':fontcolor=white:fontsize=55:x=100:y=50:enable=between(t\\,0\\,5),"
     f"drawtext=fontfile='{font}':text='Subject':fontcolor=yellow:fontsize=38:x=50:y=900:enable=between(t\\,0\\,5)"),

    ("drawtext then fade",
     f"drawtext=fontfile='{font}':text='Title':fontcolor=white:fontsize=55:x=100:y=50,"
     f"fade=t=in:st=0:d=0.5"),
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
    err  = [l for l in r.stderr.split("\n") if "Error" in l]
    print(f"[{label}]")
    print(f"  size={size} rc={r.returncode}")
    if kbps: print(f"  {kbps[-1].strip()}")
    if err:  print(f"  {err[0]}")
    print()
