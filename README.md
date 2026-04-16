# FlawlessCut - Automated Video Editing

FlawlessCut is an intelligent video editing application that automates the creation of professional-looking vlogs and study videos. Upload your clips, add metadata, and let the AI-powered pipeline handle the rest - from trimming and transitions to automatic YouTube uploads.

## ✨ Features

### 🎬 Video Processing
- **Automatic Editing**: Intelligent clip sequencing and grouping
- **Professional Transitions**: Smooth crossfades and scene transitions
- **Text Overlays**: Auto-generated subject and time overlays
- **Audio Mixing**: Background music with customizable volume levels
- **Multi-format Support**: MP4, MOV, AVI, MKV, WebM

### 🎵 Audio Engine
- **Clip Audio Control**: Enable/disable audio per clip
- **Background Music**: Add royalty-free tracks with volume control
- **Volume Balancing**: Automatic audio level normalization

### 🎨 Visual Design
- **Glass Morphism UI**: Modern frosted glass design with backdrop blur
- **Dark/Light Themes**: Multiple theme options with smooth transitions
- **Responsive Layout**: Works on desktop and mobile devices
- **Drag & Drop**: Intuitive clip grouping and reordering

### 📺 YouTube Integration (NEW!)
- **One-Click Upload**: Automatic upload after video processing
- **Smart Metadata**: Auto-generated titles, descriptions, and tags
- **Thumbnail Upload**: Custom thumbnails for your videos
- **Privacy Control**: Private, unlisted, or public video settings
- **OAuth Security**: Secure authentication with Google

### 🖼️ Thumbnail Generator
- **Custom Templates**: Design your own thumbnail backgrounds
- **Dynamic Text**: Auto-generated titles and day counters
- **High Quality**: Optimized for YouTube and social media

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- FFmpeg (for video processing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FlawlessCut
   ```

2. **Set up Python environment**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

3. **Set up frontend**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Start the application**
   ```bash
   # Windows
   start.bat

   # Manual start
   # Terminal 1: python -m uvicorn app.main:app --reload --port 8000
   # Terminal 2: cd frontend && npm run dev
   ```

5. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

## 📺 YouTube Integration Setup

To enable automatic YouTube uploads:

1. **Follow the setup guide**: See `YOUTUBE_SETUP.md` for detailed instructions
2. **Validate your credentials**: Run `python validate_secrets.py` to check your `client_secrets.json`
3. **Test your setup**: Run `python test_youtube.py` to verify authentication
4. **Connect your channel**: Click "Connect YouTube Channel" in the web interface

### YouTube Features
- **Automatic Upload**: Videos upload automatically after processing
- **Smart Metadata**: Titles, descriptions, and tags generated from your project data
- **Thumbnail Upload**: Custom thumbnails uploaded with videos
- **Privacy Settings**: Choose private, unlisted, or public visibility

### Helper Scripts
- `validate_secrets.py` - Validates your client_secrets.json file format
- `test_youtube.py` - Tests complete YouTube authentication and channel access

## 🎯 How to Use

### Basic Workflow
1. **Upload Clips**: Drag and drop video files into the library
2. **Add Metadata**: Set subject, time, and trim settings for each clip
3. **Group Clips**: Drag clip dots to connect related clips
4. **Configure Audio**: Set background music and volume levels
5. **Set Project Details**: Add title, author, and creation date
6. **Optional: YouTube Setup**: Connect your channel and configure upload settings
7. **Render**: Click "Render Project" and wait for completion
8. **Download/Upload**: Get your video file or view it on YouTube

### Advanced Features
- **Clip Grouping**: Connect clips with the drag dots for seamless transitions
- **Trim Controls**: Set start/end times for precise editing
- **Template System**: Use JSON templates for consistent video styles
- **Batch Processing**: Process multiple clips simultaneously

## 🏗️ Architecture

### Backend (FastAPI)
- **Video Processing**: FFmpeg-powered editing pipeline
- **API Endpoints**: RESTful API for frontend communication
- **Progress Tracking**: Real-time processing status updates
- **YouTube Integration**: OAuth2 authentication and upload handling

### Frontend (React)
- **Modern UI**: Framer Motion animations and glass morphism design
- **Drag & Drop**: @dnd-kit for intuitive interactions
- **State Management**: React hooks for complex state handling
- **Responsive Design**: Mobile-first approach with CSS Grid/Flexbox

### Processing Pipeline
1. **Normalization**: Convert clips to consistent format and add overlays
2. **Merging**: Combine clips with group-aware sequencing
3. **Audio Mixing**: Blend clip audio with background music
4. **Intro/Outro**: Add generated title cards and end screens
5. **Final Export**: Apply fades and export to MP4
6. **YouTube Upload**: Optional automatic upload with metadata

## 📁 Project Structure

```
FlawlessCut/
├── app/                    # Backend FastAPI application
│   ├── main.py            # Main API endpoints
│   ├── pipeline.py        # Video processing workflow
│   ├── video_processor.py # FFmpeg operations
│   ├── youtube_service.py # YouTube API integration
│   └── template_loader.py # Template management
├── frontend/              # React application
│   ├── src/
│   │   ├── App.jsx       # Main application component
│   │   ├── App.css       # Styling and themes
│   │   └── components/   # Reusable components
├── assets/               # Static assets and folders
│   ├── raw/             # Uploaded video clips
│   ├── processed/       # Normalized clips
│   ├── music/           # Background audio files
│   └── output/          # Final rendered videos
├── templates/           # JSON configuration templates
├── temp/               # Temporary processing files
├── YOUTUBE_SETUP.md    # YouTube integration guide
└── requirements.txt    # Python dependencies
```

## 🔧 Configuration

### Video Settings
Edit `templates/study_vlog.json` to customize:
- Output resolution and framerate
- Transition durations
- Default music and volume
- Text overlay styling

### Environment Variables
Create a `.env` file for custom settings:
```
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
YOUTUBE_CLIENT_SECRETS=client_secrets.json
```

## 🐛 Troubleshooting

### Common Issues
- **FFmpeg not found**: Ensure FFmpeg is installed and in PATH
- **Port conflicts**: Change ports in start.bat if 5173/8000 are in use
- **YouTube auth fails**: Check client_secrets.json and API quotas
- **Video processing fails**: Check file permissions and disk space

### Debug Mode
Run with debug logging:
```bash
python -m uvicorn app.main:app --reload --log-level debug
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- FFmpeg for video processing capabilities
- Google YouTube API for upload functionality
- React and FastAPI communities for excellent frameworks

---

**Made with ❤️ for content creators who want to focus on content, not editing.**