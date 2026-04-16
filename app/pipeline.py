# app/pipeline.py
import sys
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from template_loader import load_template, get_intro_settings, get_music_settings, get_transition_settings
from video_processor import normalize_all, merge_videos, mix_music, mix_voiceovers, add_intro_outro_and_fade

progress = {"step": "idle", "pct": 0}


def set_progress(step, pct):
    progress["step"] = step
    progress["pct"]  = pct
    print(f"[{pct}%] {step}")


def run_pipeline(template_filename="study_vlog.json", clip_order=None, clip_data=None,
                 clip_audio=None, global_audio=True, clip_volume=1.0, groups=None, voices=None):
    set_progress("Starting", 0)

    template = load_template(template_filename)
    if not template:
        raise RuntimeError("Template not found.")

    intro     = get_intro_settings(template)
    music_cfg = get_music_settings(template)
    trans_cfg = get_transition_settings(template)

    title       = intro.get("title", "final_vlog")
    output_name = title.replace(" ", "_").replace("/", "-") + ".mp4"

    if not global_audio:
        clip_audio = {f: False for f in (clip_order or [])}

    # Step 1 — Normalize (parallel, with trim)
    set_progress("Normalizing clips", 10)
    normalize_all(clip_order=clip_order, clip_data=clip_data, clip_audio=clip_audio)

    # Step 2 — Merge (group-aware)
    set_progress("Merging clips", 35)
    if not merge_videos("merged.mp4", groups=groups):
        raise RuntimeError("Pipeline failed at merge step.")

    # Step 3 — Mix music
    set_progress("Mixing background music", 60)
    if not mix_music(
        input_filename  = "merged.mp4",
        output_filename = "merged_music.mp4",
        music_filename  = music_cfg.get("filename", "background.mp3"),
        music_volume    = music_cfg.get("volume", 0.15),
        clip_volume     = clip_volume
    ):
        raise RuntimeError("Pipeline failed at music step.")

    # Step 3b — Mix voiceovers
    if voices:
        set_progress("Mixing voiceovers", 70)
        input_vo  = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "output", "merged_music.mp4")
        output_vo = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "output", "merged_vo.mp4")
        if not mix_voiceovers(input_vo, output_vo, voices):
            raise RuntimeError("Pipeline failed at voiceover step.")
        import shutil
        shutil.move(output_vo, input_vo)

    # Step 4 — Intro/outro + final fade
    set_progress("Adding intro, outro & fade", 80)
    if not add_intro_outro_and_fade(
        input_filename  = "merged_music.mp4",
        output_filename = output_name,
        title           = title,
        date            = intro.get("date", ""),
        author          = intro.get("author", ""),
        fade_duration   = trans_cfg.get("fade_duration", 1.0)
    ):
        raise RuntimeError("Pipeline failed at intro/outro step.")

    set_progress("Done", 100)
    print(f"\nDone! -> assets/output/{output_name}")
    return output_name


if __name__ == "__main__":
    run_pipeline()
