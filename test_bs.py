import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))
from video_processor import FONT, esc

print("FONT:", repr(FONT), "backslashes:", FONT.count("\\"))

title = esc("My Vlog")
s = f"drawtext=fontfile='{FONT}':text='{title}':fontcolor=white"
print("vf snippet:", repr(s))
print("backslashes in vf:", s.count("\\"))
