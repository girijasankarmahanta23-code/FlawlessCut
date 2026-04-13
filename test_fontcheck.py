import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))
from video_processor import FONT
print("FONT repr:", repr(FONT))
print("FONT str:", FONT)

# Write to file and read back raw bytes
with open("temp/font_check.txt", "w", encoding="utf-8", newline="") as f:
    f.write(f"fontfile='{FONT}'")
with open("temp/font_check.txt", "rb") as f:
    print("File bytes:", f.read())
