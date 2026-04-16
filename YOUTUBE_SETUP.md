# YouTube API Setup Guide - Step by Step

To enable automatic YouTube uploads in FlawlessCut, follow these exact steps:

## Step 1: Create Google Cloud Project

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click the project dropdown at the top
   - Click "New Project"
   - Name it: `FlawlessCut` (or any name you prefer)
   - Click "Create"

3. **Wait for project creation** (takes ~30 seconds)

## Step 2: Enable YouTube Data API

1. **Go to APIs & Services**
   - In the left sidebar, click "APIs & Services" → "Library"

2. **Find YouTube Data API v3**
   - Search for: `YouTube Data API v3`
   - Click on it in the results

3. **Enable the API**
   - Click the blue "Enable" button
   - Wait for it to enable (takes a few seconds)

## Step 3: Create OAuth Credentials

1. **Go to Credentials Page**
   - In the left sidebar, click "APIs & Services" → "Credentials"

2. **Configure OAuth Consent Screen** (if prompted)
   - Click "Configure Consent Screen"
   - Choose "External" user type
   - Click "Create"

3. **Fill OAuth Consent Screen**
   - **App name**: `FlawlessCut`
   - **User support email**: Select your email from dropdown
   - **Developer contact information**: Enter your email
   - Click "Save and Continue"

4. **Scopes** (leave default)
   - Click "Save and Continue"

5. **Test Users** (optional)
   - Add your Google account email if you want
   - Click "Save and Continue"

6. **Summary**
   - Click "Back to Dashboard"

## Step 4: Create Desktop Application Credentials

1. **Create Credentials**
   - Click the "+ CREATE CREDENTIALS" button
   - Select "OAuth 2.0 Client IDs"

2. **Configure Client ID**
   - **Application type**: `Desktop application`
   - **Name**: `FlawlessCut Desktop App`
   - Click "Create"

3. **Download Credentials**
   - A popup will appear with your Client ID
   - Click "DOWNLOAD JSON"
   - Save the file as `client_secrets.json`

## Step 5: Place File in FlawlessCut

1. **Locate the downloaded file**
   - It should be named something like `client_secret_123456789.json`

2. **Rename and move**
   - Rename it to: `client_secrets.json`
   - Move it to: `E:\02_Dev_Space\01_Projects\FlawlessCut\client_secrets.json`

3. **Verify placement**
   ```
   FlawlessCut/
   ├── client_secrets.json  ← Place here (remove .example extension)
   ├── app/
   ├── frontend/
   └── ...
   ```

## Step 6: Test Your Setup

1. **Run the test script**
   ```bash
   python test_youtube.py
   ```

2. **Expected output** (first time):
   ```
   Testing YouTube Authentication...
   ==================================================
   ✅ client_secrets.json found
   🔐 Attempting authentication...
   ```
   - A browser window will open
   - Sign in with your Google account
   - Grant permissions to FlawlessCut
   - Close the browser window

3. **Success output**:
   ```
   ✅ Authentication successful!
   📺 Getting channel information...
   ✅ Channel found!
      Channel Title: Your Channel Name
      Channel ID: UCxxxxxxxxxxxxxxxxx
      Subscribers: XXX
      Videos: XXX
   🎉 YouTube integration is ready!
   ```

## Step 7: Use in FlawlessCut

1. **Start FlawlessCut**
   ```bash
   start.bat
   ```

2. **Connect YouTube**
   - Open: http://localhost:5173
   - Scroll to "YouTube Upload" section
   - Click "Connect YouTube Channel"
   - Follow the authentication flow

3. **Configure Upload Settings**
   - Check "Upload to YouTube after processing"
   - Choose privacy setting (Private recommended for testing)
   - Optionally customize title, description, tags

4. **Test Upload**
   - Create a test project with 1-2 short clips
   - Click "Render Project"
   - Wait for completion
   - Check your YouTube channel for the uploaded video!

## Troubleshooting

### "client_secrets.json not found"
- Ensure file is in the correct location: `FlawlessCut/client_secrets.json`
- Check filename (no extra extensions)

### "Authentication failed"
- Verify YouTube Data API v3 is enabled
- Check that OAuth consent screen is configured
- Try creating new credentials

### "No channel found"
- Make sure you're signed into a YouTube channel account
- Brand accounts need special setup

### Upload Quota Exceeded
- YouTube has daily upload limits
- Check your quota usage in Google Cloud Console

### Browser doesn't open for auth
- Run: `python test_youtube.py` manually
- The auth URL will be shown in console

## Security Notes

- `client_secrets.json` contains sensitive information
- `youtube_token.pickle` stores your access tokens (auto-created)
- Never share these files or commit them to version control
- The app only requests upload permissions, not access to existing videos

## Need Help?

If you get stuck:
1. Check the Google Cloud Console for error messages
2. Verify all steps in this guide
3. Test with `python test_youtube.py`
4. Check the FlawlessCut console for detailed error messages

The setup takes about 10-15 minutes and only needs to be done once!