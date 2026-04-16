#!/usr/bin/env python3
"""
Quick YouTube Setup Validator
Checks if your client_secrets.json file is properly formatted.
"""

import os
import sys
import json

def validate_client_secrets():
    print("🔍 Validating client_secrets.json...")
    print("=" * 40)

    file_path = os.path.join(os.path.dirname(__file__), "client_secrets.json")

    if not os.path.exists(file_path):
        print("❌ File not found!")
        print(f"   Looking for: {file_path}")
        print("   💡 Download from Google Cloud Console first")
        return False

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Check structure
        if 'installed' not in data:
            print("❌ Missing 'installed' key!")
            print("   This should be a Desktop application credential")
            return False

        installed = data['installed']

        required_fields = ['client_id', 'client_secret', 'project_id']
        missing_fields = []

        for field in required_fields:
            if field not in installed:
                missing_fields.append(field)
            elif not installed[field] or str(installed[field]).startswith('YOUR_'):
                print(f"❌ {field} is not set properly!")
                print("   Replace placeholder values with real credentials")
                return False

        if missing_fields:
            print(f"❌ Missing required fields: {', '.join(missing_fields)}")
            return False

        # Success
        print("✅ client_secrets.json is valid!")
        print(f"   📋 Project ID: {installed['project_id']}")
        print(f"   🔑 Client ID: {installed['client_id'][:20]}...")
        print("   🎉 Ready for YouTube authentication!")

        return True

    except json.JSONDecodeError as e:
        print("❌ Invalid JSON format!")
        print(f"   Error: {e}")
        print("   💡 Check for syntax errors in the file")
        return False
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return False

if __name__ == "__main__":
    print("YouTube Credentials Validator")
    print("============================")
    success = validate_client_secrets()
    if not success:
        print("\n📖 Need help? Follow YOUTUBE_SETUP.md")
    sys.exit(0 if success else 1)