#!/usr/bin/env python3
"""
YouTube Integration Test Script
Run this to test your YouTube API setup before using the full application.
"""

import os
import sys
import webbrowser
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.youtube_service import youtube_service

def test_youtube_auth():
    print("🔍 Testing YouTube Authentication...")
    print("=" * 50)

    # Check if client_secrets.json exists
    client_secrets_path = os.path.join(os.path.dirname(__file__), "client_secrets.json")
    if not os.path.exists(client_secrets_path):
        print("❌ client_secrets.json not found!")
        print(f"   Expected location: {client_secrets_path}")
        print("   📖 Please follow YOUTUBE_SETUP.md to create this file.")
        print()
        print("💡 Quick steps:")
        print("   1. Go to: https://console.cloud.google.com/")
        print("   2. Create a project")
        print("   3. Enable YouTube Data API v3")
        print("   4. Create OAuth 2.0 Desktop credentials")
        print("   5. Download and rename to client_secrets.json")
        return False

    print("✅ client_secrets.json found")

    # Check file contents
    try:
        with open(client_secrets_path, 'r') as f:
            import json
            secrets = json.load(f)
            if 'installed' not in secrets:
                print("❌ Invalid client_secrets.json format!")
                print("   Expected 'installed' key not found.")
                return False
            if not secrets['installed'].get('client_id'):
                print("❌ client_id missing in client_secrets.json!")
                return False
            if not secrets['installed'].get('client_secret'):
                print("❌ client_secret missing in client_secrets.json!")
                return False
        print("✅ client_secrets.json format is valid")
    except json.JSONDecodeError:
        print("❌ client_secrets.json is not valid JSON!")
        return False
    except Exception as e:
        print(f"❌ Error reading client_secrets.json: {e}")
        return False

    # Try authentication
    print("\n🔐 Attempting authentication...")
    print("   (A browser window should open for Google OAuth)")
    try:
        success = youtube_service.authenticate()
        if success:
            print("✅ Authentication successful!")
        else:
            print("❌ Authentication failed!")
            print("   💡 This might be normal on first run.")
            print("   💡 Try running the app and clicking 'Connect YouTube Channel'")
            return False
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        print("   💡 Check your internet connection and try again")
        return False

    # Get channel info
    print("\n📺 Getting channel information...")
    try:
        channel_info = youtube_service.get_channel_info()
        if channel_info:
            print("✅ Channel found!")
            print(f"   📺 Channel Title: {channel_info['snippet']['title']}")
            print(f"   🆔 Channel ID: {channel_info['id']}")
            print(f"   👥 Subscribers: {channel_info['statistics'].get('subscriberCount', 'N/A')}")
            print(f"   🎬 Videos: {channel_info['statistics'].get('videoCount', 'N/A')}")
        else:
            print("❌ No channel information found!")
            print("   💡 Make sure you're signed into a YouTube channel account")
            return False
    except Exception as e:
        print(f"❌ Error getting channel info: {e}")
        print("   💡 You might need to re-authenticate")
        return False

    print("\n🎉 YouTube integration is ready!")
    print("   ✅ You can now use automatic YouTube uploads in FlawlessCut.")
    print("   🚀 Start the app with: start.bat")
    print("   🔗 Then visit: http://localhost:5173")
    return True

if __name__ == "__main__":
    print("YouTube API Test for FlawlessCut")
    print("=================================")
    success = test_youtube_auth()
    if not success:
        print("\n" + "=" * 50)
        print("💡 Need help? Check YOUTUBE_SETUP.md for detailed instructions.")
        print("📧 Still stuck? The setup takes about 10-15 minutes.")
        sys.exit(1)
    sys.exit(0)