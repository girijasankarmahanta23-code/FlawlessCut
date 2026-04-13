# app/template_loader.py
# Loads and validates a vlog template from a JSON file

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES_FOLDER = os.path.join(ROOT, "templates")


def load_template(template_filename="study_vlog.json"):
    template_path = os.path.join(TEMPLATES_FOLDER, template_filename)

    if not os.path.exists(template_path):
        print(f"[ERROR] Template not found: {template_path}")
        return None

    with open(template_path, "r") as f:
        template = json.load(f)

    print(f"[OK] Template loaded: {template['template_name']}")
    return template


def get_intro_settings(template):
    return template.get("intro", {})

def get_outro_settings(template):
    return template.get("outro", {})

def get_text_overlay_settings(template):
    return template.get("text_overlay", {})

def get_music_settings(template):
    return template.get("music", {})

def get_transition_settings(template):
    return template.get("transition", {})

def get_video_settings(template):
    return template.get("video", {})


if __name__ == "__main__":
    template = load_template("study_vlog.json")
    if template:
        print("\n--- Template Settings ---")
        print("Intro     :", get_intro_settings(template))
        print("Outro     :", get_outro_settings(template))
        print("Overlay   :", get_text_overlay_settings(template))
        print("Music     :", get_music_settings(template))
        print("Transition:", get_transition_settings(template))
        print("Video     :", get_video_settings(template))