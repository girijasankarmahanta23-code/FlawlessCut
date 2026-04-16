# app/youtube_service.py
import os
import json
import pickle
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# YouTube API scopes
SCOPES = ["https://www.googleapis.com/auth/youtube.upload",
          "https://www.googleapis.com/auth/youtube",
          "https://www.googleapis.com/auth/youtube.force-ssl"]

class YouTubeService:
    def __init__(self):
        self.youtube = None
        self.credentials = None
        self.token_path = os.path.join(ROOT, "youtube_token.pickle")
        self.client_secrets_path = os.path.join(ROOT, "client_secrets.json")

    def authenticate(self) -> bool:
        """Authenticate with YouTube API using OAuth 2.0"""
        try:
            # Load existing credentials
            if os.path.exists(self.token_path):
                with open(self.token_path, 'rb') as token:
                    self.credentials = pickle.load(token)

            # Refresh expired credentials
            if self.credentials and self.credentials.expired and self.credentials.refresh_token:
                self.credentials.refresh(Request())
            elif not self.credentials or not self.credentials.valid:
                # Start OAuth flow
                if not os.path.exists(self.client_secrets_path):
                    raise FileNotFoundError("client_secrets.json not found. Please download from Google Cloud Console.")

                flow = InstalledAppFlow.from_client_secrets_file(
                    self.client_secrets_path, SCOPES)
                self.credentials = flow.run_local_server(port=8080)

            # Save credentials
            with open(self.token_path, 'wb') as token:
                pickle.dump(self.credentials, token)

            # Build YouTube API client
            self.youtube = build('youtube', 'v3', credentials=self.credentials)
            return True

        except Exception as e:
            print(f"YouTube authentication failed: {e}")
            return False

    def upload_video(self, video_path: str, thumbnail_path: str = None,
                    title: str = "", description: str = "",
                    tags: list = None, privacy: str = "private") -> Optional[str]:
        """Upload video to YouTube and optionally set thumbnail"""

        if not self.youtube:
            if not self.authenticate():
                return None

        try:
            # Prepare video metadata
            body = {
                'snippet': {
                    'title': title or f"FlawlessCut Vlog - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                    'description': description or "Created with FlawlessCut - Automated video editing made simple.",
                    'tags': tags or ['vlog', 'automated', 'flawlesscut'],
                    'categoryId': '22'  # People & Blogs
                },
                'status': {
                    'privacyStatus': privacy,  # private, public, or unlisted
                    'madeForKids': False
                }
            }

            # Upload video
            media = MediaFileUpload(video_path, chunksize=-1, resumable=True)
            request = self.youtube.videos().insert(
                part=','.join(body.keys()),
                body=body,
                media_body=media
            )

            response = None
            while response is None:
                status, response = request.next_chunk()
                if status:
                    print(f"Upload progress: {int(status.progress() * 100)}%")

            video_id = response['id']
            print(f"Video uploaded successfully! Video ID: {video_id}")

            # Upload thumbnail if provided
            if thumbnail_path and os.path.exists(thumbnail_path):
                self.set_thumbnail(video_id, thumbnail_path)

            return video_id

        except Exception as e:
            print(f"Video upload failed: {e}")
            return None

    def set_thumbnail(self, video_id: str, thumbnail_path: str) -> bool:
        """Set custom thumbnail for uploaded video"""
        try:
            media = MediaFileUpload(thumbnail_path)
            self.youtube.thumbnails().set(
                videoId=video_id,
                media_body=media
            ).execute()
            print(f"Thumbnail set successfully for video {video_id}")
            return True
        except Exception as e:
            print(f"Thumbnail upload failed: {e}")
            return False

    def get_channel_info(self) -> Optional[Dict[str, Any]]:
        """Get authenticated user's channel information"""
        if not self.youtube:
            if not self.authenticate():
                return None

        try:
            request = self.youtube.channels().list(
                part='snippet,statistics',
                mine=True
            )
            response = request.execute()
            return response['items'][0] if response['items'] else None
        except Exception as e:
            print(f"Failed to get channel info: {e}")
            return None

    def generate_video_metadata(self, template_data: dict, form_data: dict) -> Dict[str, Any]:
        """Generate YouTube metadata from template and form data"""
        title = form_data.get('title', template_data.get('intro', {}).get('title', ''))
        author = form_data.get('author', template_data.get('intro', {}).get('author', ''))
        date = form_data.get('date', template_data.get('intro', {}).get('date', ''))

        # Generate SEO-optimized title
        if not title:
            title = f"{author}'s Study Session - {date}" if author and date else f"Study Vlog - {datetime.now().strftime('%B %d, %Y')}"

        # Generate description
        description_parts = []
        if author:
            description_parts.append(f"👋 Welcome to {author}'s channel!")
        if date:
            description_parts.append(f"📅 Recorded on {date}")
        if template_data.get('text_overlay', {}).get('subject'):
            description_parts.append(f"📚 Topic: {template_data['text_overlay']['subject']}")
        if template_data.get('text_overlay', {}).get('time'):
            description_parts.append(f"⏰ Time: {template_data['text_overlay']['time']}")

        description_parts.extend([
            "",
            "🎥 Created with FlawlessCut - Automated video editing made simple.",
            "",
            "🔗 Check out FlawlessCut for your own automated video editing needs!",
            "",
            "#studyvlog #studymotivation #studywithme #studyhacks"
        ])

        description = '\n'.join(description_parts)

        # Generate tags
        tags = ['study', 'vlog', 'studyvlog', 'studymotivation']
        if template_data.get('text_overlay', {}).get('subject'):
            tags.append(template_data['text_overlay']['subject'].lower().replace(' ', ''))
        if author:
            tags.append(author.lower().replace(' ', ''))

        return {
            'title': title,
            'description': description,
            'tags': tags[:15]  # YouTube allows max 15 tags
        }

# Global YouTube service instance
youtube_service = YouTubeService()