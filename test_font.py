import subprocess, os

FFMPEG = r"C:\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
inp    = r"E:\02_Dev_Space\01_Projects\FlawlessCut\assets\output\merged.mp4"
out    = r"E:\02_Dev_Space\01_Projects\FlawlessCut\assets\output\test_font.mp4"
script = r"E:\02_Dev_Space\01_Projects\FlawlessCut\temp\font_test.txt"

# Test different font path formats
font_variants = [
    "C\\\\:/Windows/Fonts/arial.ttf",   # C\\:/
    "C\\:/Windows/Fonts/arial.ttf",     # C\:/
    "C:/Windows/Fonts/arial.ttf",       # C:/
    "/Windows/Fonts/arial.ttf",         # no drive
]

for font in font_variants:
    fc = f"[0:v]drawtext=fontfile='{font}':text='Hello World':fontcolor=white:fontsize=60:x=100:y=100[vout]"
    with open(script, "w", encoding="utf-8", newline="") as f:
        f.write(fc)

    r = subprocess.run([
        FFMPEG, "-i", inp,
        "-filter_complex_script", script,
        "-map", "[vout]", "-an",
        "-c:v", "libx264", "-crf", "23", "-preset", "ultrafast",
        "-t", "2", "-y", out
    ], capture_output=True, text=True)

    size = os.path.getsize(out) if os.path.exists(out) else 0
    # Check if video has real content (not blank)
    lines = [l for l in r.stderr.split("\n") if "kb/s" in l and "libx264" in l]
    kbps = lines[-1] if lines else "?"
    print(f"font='{font}' -> size={size} | {kbps.strip()}")
