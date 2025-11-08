# 🚀 Quick Start Guide - EduExtract Chrome Extension

## Step-by-Step Installation (5 minutes)

### Step 1: Generate Icons (1 minute)
1. Open `generate-icons.html` in your browser (double-click the file)
2. Click "Download All Icons" button
3. Three PNG files will download: `icon16.png`, `icon48.png`, `icon128.png`
4. Move these 3 files into the `chrome-extension/icons/` folder

### Step 2: Update URLs (1 minute)
1. Open `popup.js` in a text editor
2. Find lines 2-3 and update to your URLs:
   ```javascript
   const API_BASE_URL = 'http://localhost:5000';  // Your backend
   const FRONTEND_URL = 'http://localhost:5173';  // Your frontend
   ```

3. Open `background.js`
4. Update line 3:
   ```javascript
   const FRONTEND_URL = 'http://localhost:5173';
   ```

### Step 3: Load Extension in Chrome (2 minutes)
1. Open Google Chrome
2. Type in address bar: `chrome://extensions/`
3. Turn ON "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked" button
5. Select the `chrome-extension` folder
6. ✅ Extension loaded! You should see "EduExtract - AI Learning Assistant"

### Step 4: Pin Extension (30 seconds)
1. Click the puzzle piece icon in Chrome toolbar (next to address bar)
2. Find "EduExtract - AI Learning Assistant"
3. Click the pin icon 📌
4. ✅ Extension now visible in toolbar!

### Step 5: Test It! (1 minute)
1. Go to any YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
2. Click the EduExtract icon in toolbar
3. You should see:
   - YouTube Video Detected
   - Quick action buttons
4. Try clicking "Summary" or "Blog"
5. ✅ Dashboard should open with the video URL!

---

## Troubleshooting

### ❌ Icons not showing?
**Solution**: Make sure you moved all 3 PNG files to the `icons/` folder:
```
chrome-extension/
└── icons/
    ├── icon16.png   ← Required
    ├── icon48.png   ← Required
    └── icon128.png  ← Required
```

### ❌ "Load unpacked" button is gray?
**Solution**: Enable "Developer mode" first (toggle in top-right)

### ❌ Buttons don't work?
**Solution**: 
1. Make sure your EduExtract app is running (backend + frontend)
2. Check URLs in `popup.js` match your running servers
3. Press F12 on the popup to see console errors

### ❌ YouTube button not appearing?
**Solution**: 
1. Refresh the YouTube page
2. Wait 2-3 seconds for page to load
3. Look below the video player for blue "EduExtract" button

---

## Features Overview

### 1️⃣ Extension Popup
- Click extension icon → See current page info
- Quick buttons to generate content
- Works on any YouTube video

### 2️⃣ YouTube Integration
- Blue "EduExtract" button appears on YouTube videos
- Click to open dashboard with video loaded
- Auto-detects video vs playlist

### 3️⃣ Right-Click Menu
- Right-click any YouTube link
- "Generate with EduExtract" → Choose content type
- Opens dashboard with selected generation

---

## What Next?

### For Development:
- Keep extension loaded while testing
- Make changes to code
- Click reload button on extension card to update
- No need to uninstall/reinstall

### For Production:
- Update URLs to your deployed app
- Update manifest.json host_permissions
- Create ZIP file for Chrome Web Store
- Submit for review ($5 fee)

### For FYP Demo:
- Show extension in action during presentation
- Demonstrate YouTube integration
- Show quick content generation
- Highlight seamless workflow

---

## Common Questions

**Q: Do I need to rebuild my app?**
A: No! Extension works with your existing app. Just make sure it's running.

**Q: Can others use this extension?**
A: Yes, but they need to load it manually (unpacked) or you publish to Chrome Web Store.

**Q: Does it work offline?**
A: No, it requires your EduExtract backend to be running.

**Q: Can I customize the design?**
A: Yes! Edit `popup.html` and `popup.css` to match your brand.

**Q: What about Firefox/Edge?**
A: Chrome extensions work on Edge. For Firefox, you'd need a WebExtension version.

---

## Support

If you encounter any issues:
1. Check the README.md for detailed docs
2. Check browser console (F12) for errors
3. Verify your app URLs are correct
4. Make sure backend and frontend are running

---

## Success Checklist ✅

- [ ] Icons generated and in `icons/` folder
- [ ] URLs updated in `popup.js` and `background.js`
- [ ] Extension loaded in Chrome
- [ ] Developer mode enabled
- [ ] Extension pinned to toolbar
- [ ] Tested on YouTube video
- [ ] Dashboard opens correctly
- [ ] Content generation works

If all checked, you're done! 🎉

---

**Estimated Time**: 5-10 minutes total
**Difficulty**: Easy (just follow steps)
**Result**: Professional Chrome extension for your FYP! ⭐
