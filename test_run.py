import subprocess, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))
from video_processor import FFMPEG, ENCODE_OPTS, OUTPUT_FOLDER, _run

inp = os.path.join(OUTPUT_FOLDER, "merged.mp4")
vf  = "drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='My Vlog':fontcolor=white:fontsize=55:x=(w-text_w)/2:y=35:enable='between(t,0.000,8.767)',drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='DSA':fontcolor=yellow:fontsize=38:x=35:y=h-th-35:enable='between(t,0.000,8.767)',fade=t=in:st=0:d=0.5,fade=t=out:st=15.400:d=0.5"

# Test 1: direct subprocess.run
out1 = os.path.join(OUTPUT_FOLDER, "test_direct_sub.mp4")
r1 = subprocess.run([FFMPEG, "-i", inp, "-vf", vf, *ENCODE_OPTS, "-an", "-t", "5", "-y", out1],
                    capture_output=True, text=True)
s1 = os.path.getsize(out1) if os.path.exists(out1) else 0
print(f"direct subprocess.run: size={s1} rc={r1.returncode}")

# Test 2: via _run
out2 = os.path.join(OUTPUT_FOLDER, "test_via_run.mp4")
r2 = _run([FFMPEG, "-i", inp, "-vf", vf, *ENCODE_OPTS, "-an", "-t", "5", "-y", out2])
s2 = os.path.getsize(out2) if os.path.exists(out2) else 0
print(f"via _run: size={s2} rc={r2.returncode}")

# Test 3: without -t limit (full video)
out3 = os.path.join(OUTPUT_FOLDER, "test_full.mp4")
r3 = _run([FFMPEG, "-i", inp, "-vf", vf, *ENCODE_OPTS, "-an", "-y", out3])
s3 = os.path.getsize(out3) if os.path.exists(out3) else 0
print(f"full video via _run: size={s3} rc={r3.returncode}")
kbps = [l for l in r3.stderr.split("\n") if "kb/s:" in l and "libx264" in l]
if kbps: print(kbps[-1])
