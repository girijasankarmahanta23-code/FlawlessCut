import subprocess, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))
from video_processor import add_overlays_and_music, PROCESSED_FOLDER, OUTPUT_FOLDER, TEMP_FOLDER

clips = os.listdir(PROCESSED_FOLDER)
print("Clips:", clips)

result = add_overlays_and_music(
    input_filename="merged.mp4",
    output_filename="test_overlay_out.mp4",
    title="Test Title",
    clip_data=[{"clip": clips[0], "subject": "DSA", "time": "9:00 AM"}],
    fade_duration=0.5,
    music_filename="background.mp3",
    music_volume=0.15,
    clip_volume=1.0
)
print("Result:", result)

# Print the script that was written
for fname in ["fc_script.txt", "vf_script.txt"]:
    p = os.path.join(TEMP_FOLDER, fname)
    if os.path.exists(p):
        print(f"\n--- {fname} ---")
        with open(p, "rb") as f:
            raw = f.read()
        print("bytes:", raw[:200])

out = os.path.join(OUTPUT_FOLDER, "test_overlay_out.mp4")
print("\nOutput size:", os.path.getsize(out) if os.path.exists(out) else "NOT FOUND")
