# EduExtract Chrome Extension

AI-powered learning assistant that generates educational content from YouTube videos, PDFs, and web pages.

## Features

- 📺 **YouTube Integration**: One-click content generation from any YouTube video
- 🎯 **Quick Actions**: Generate summaries, blogs, quizzes, flashcards, and slides
- 🔍 **Context Menu**: Right-click on any link to generate content
- 🎨 **Beautiful UI**: Modern, clean interface matching EduExtract brand
- ⚡ **Fast Access**: Quick popup for instant access to features

## Installation (Development)

### 1. Generate Icons

You need to create three icon sizes (16x16, 48x48, 128x128). You can:

**Option A: Use an online tool**
- Go to https://www.favicon-generator.org/
- Upload your logo
- Download and extract icons
- Rename them to `icon16.png`, `icon48.png`, `icon128.png`
- Place in the `icons/` folder

**Option B: Use Photoshop/Figma**
- Create a 128x128 blue gradient icon with "EE" text
- Resize to 48x48 and 16x16
- Save as PNG files

### 2. Update Configuration

Edit `popup.js` and `background.js`:

```javascript
// Change these to your URLs:
const API_BASE_URL = 'http://localhost:5000';      // Your backend
const FRONTEND_URL = 'http://localhost:5173';      // Your frontend
```

For production, use your deployed URLs:
```javascript
const API_BASE_URL = 'https://your-backend.com';
const FRONTEND_URL = 'https://your-app.com';
```

### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. The extension should now appear in your browser!

### 4. Pin the Extension

1. Click the puzzle piece icon in Chrome toolbar
2. Find "EduExtract - AI Learning Assistant"
3. Click the pin icon to keep it visible

## Usage

### Method 1: Extension Popup
1. Navigate to any YouTube video
2. Click the EduExtract icon in toolbar
3. See video info and click quick action buttons
4. Content opens in dashboard

### Method 2: YouTube Button
1. Navigate to any YouTube video
2. Look for the blue "EduExtract" button below the video
3. Click it to open dashboard with video loaded

### Method 3: Context Menu
1. Right-click on any YouTube link
2. Select "Generate with EduExtract"
3. Choose content type (Summary, Blog, etc.)
4. Dashboard opens with content generation

## Features Detail

### Quick Actions
- **Summary**: Generate concise summary
- **Blog**: Create full blog post
- **Slides**: Generate presentation
- **Quiz**: Create quiz questions
- **Flashcards**: Make study flashcards
- **Dashboard**: Open full dashboard

### YouTube Integration
- Detects YouTube videos automatically
- Shows video title in popup
- Adds button to YouTube player
- Works with playlists

### Context Menus
- Right-click any link → Generate content
- Works on YouTube, educational sites
- Quick access to all content types

## File Structure

```
chrome-extension/
├── manifest.json           # Extension configuration
├── popup.html             # Popup interface
├── popup.css              # Popup styling
├── popup.js               # Popup logic
├── content.js             # YouTube page integration
├── content.css            # YouTube button styling
├── background.js          # Background service worker
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## Troubleshooting

### Icons not showing?
- Make sure you have all three icon sizes in `icons/` folder
- Icons must be named exactly: `icon16.png`, `icon48.png`, `icon128.png`
- Reload extension after adding icons

### Buttons not working?
- Check that frontend and backend URLs are correct in `popup.js`
- Make sure your EduExtract app is running
- Check browser console for errors (F12)

### YouTube button not appearing?
- Refresh the YouTube page after loading extension
- Check that content script loaded (inspect page → check console)
- Try a different YouTube video

### Context menu not working?
- Make sure extension has necessary permissions
- Reload the extension
- Check background service worker for errors

## Development

### Testing Changes
1. Make your changes to the code
2. Go to `chrome://extensions/`
3. Click reload icon on EduExtract extension
4. Test the changes

### Debugging
- **Popup**: Right-click popup → Inspect
- **Content Script**: F12 on YouTube page → Console tab
- **Background**: chrome://extensions/ → Service worker → Inspect

## Publishing to Chrome Web Store

1. **Prepare Assets**
   - Create promotional images (1280x800, 640x400)
   - Write detailed description
   - Take screenshots

2. **Create ZIP**
   ```bash
   # From chrome-extension directory
   zip -r eduextract-extension.zip . -x "*.git*" -x "README.md"
   ```

3. **Submit**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Pay $5 one-time registration fee
   - Upload ZIP file
   - Fill in details and submit for review

## Updates for Production

Before deploying, update:

1. **URLs in `popup.js`**:
   ```javascript
   const API_BASE_URL = 'https://api.eduextract.com';
   const FRONTEND_URL = 'https://eduextract.com';
   ```

2. **URLs in `background.js`**:
   ```javascript
   const FRONTEND_URL = 'https://eduextract.com';
   ```

3. **Host permissions in `manifest.json`**:
   ```json
   "host_permissions": [
     "https://www.youtube.com/*",
     "https://eduextract.com/*",
     "https://api.eduextract.com/*"
   ]
   ```

## License

Part of EduExtract FYP Project

## Support

For issues or questions, contact your development team.
