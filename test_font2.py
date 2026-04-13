import subprocess, os

FFMPEG = r"C:\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
inp    = r"E:\02_Dev_Space\01_Projects\FlawlessCut\assets\output\merged.mp4"
script = r"E:\02_Dev_Space\01_Projects\FlawlessCut\temp\font_test2.txt"
out    = r"E:\02_Dev_Space\01_Projects\FlawlessCut\assets\output\test_font2.mp4"

# The working test used filter_complex_script with C\:/ (single backslash in file)
# Now test -filter_script:v with same
tests = [
    ("C\\:/Windows/Fonts/arial.ttf",  "single backslash colon"),
    ("C\\\\:/Windows/Fonts/arial.ttf","double backslash colon"),
    ("C\\:/Windows/Fonts/arial.ttf",  "escaped colon no quotes around fontfile"),
]

for font_in_file, label in tests:
    vf = f"drawtext=fontfile='{font_in_file}':text='Hello':fontcolor=white:fontsize=60:x=100:y=100"
    with open(script, "w", encoding="utf-8", newline="") as f:
        f.write(vf)
    with open(script, "rb") as f:
        raw = f.read()
    print(f"\n[{label}]")
    print("  bytes:", raw[:80])

    r = subprocess.run([
        FFMPEG, "-i", inp,
        "-filter_script:v", script,
        "-c:v", "libx264", "-crf", "23", "-preset", "ultrafast",
        "-an", "-t", "2", "-y", out
    ], capture_output=True, text=True)

    size = os.path.getsize(out) if os.path.exists(out) else 0
    err_lines = [l for l in r.stderr.split("\n") if "Error" in l or "kb/s" in l]
    print(f"  size={size}, rc={r.returncode}")
    for l in err_lines[-3:]:
        print(" ", l)
