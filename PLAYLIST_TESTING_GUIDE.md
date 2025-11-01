# Quick Testing Guide - Playlist Feature

## Prerequisites
1. Backend server running: `cd backend && npm start`
2. Frontend server running: `cd frontend && npm run dev`
3. Python yt-dlp installed: `pip install yt-dlp`

## Test Cases

### Test 1: Single Video (Verify Backward Compatibility)
**Expected Result:** Should work exactly as before
```
1. Open Dashboard
2. Click "Paste" button
3. Paste a single video URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
4. Click "Generate Blog"
5. ✅ Should show video player and generate blog
```

### Test 2: Playlist Detection
**Expected Result:** Should detect playlist and show info
```
1. Open Dashboard
2. Click "Paste" button
3. Paste a playlist URL: https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab
4. Wait ~1 second
5. ✅ Should show playlist info card with:
   - Playlist title
   - Video count badge
   - Processing time warning
   - First 10 videos list
```

### Test 3: Generate Blog from Playlist
**Expected Result:** Should generate comprehensive blog
```
1. Follow Test 2 to load playlist
2. Click "Blog" button
3. Wait for processing (expect ~5 sec per video + AI time)
4. ✅ Should show:
   - Processing indicator
   - Generated blog content
   - Content saved to "My Content"
```

### Test 4: Generate Slides from Playlist
**Expected Result:** Should generate comprehensive slides
```
1. Follow Test 2 to load playlist
2. Click "Slides" button
3. Wait for processing
4. ✅ Should show:
   - Generated slides (5-8 bullets each)
   - Download PPTX button
   - Slide carousel navigation
```

### Test 5: Generate Quiz from Playlist
**Expected Result:** Should generate comprehensive quiz
```
1. Follow Test 2 to load playlist
2. Click "Quiz" button
3. Wait for processing
4. ✅ Should show:
   - Multiple choice questions
   - True/False questions
   - "Start Quiz" button
```

### Test 6: Large Playlist (20+ videos)
**Expected Result:** Should handle gracefully with longer wait time
```
1. Paste a large playlist URL
2. Note the video count
3. Click any content type
4. Observe backend logs for delay messages
5. ✅ Should:
   - Show processing indicator
   - Take ~5 sec per video
   - Generate content successfully
   - Handle any failed videos gracefully
```

### Test 7: Error Handling - Invalid Playlist
**Expected Result:** Should show error message
```
1. Paste an invalid playlist URL
2. ✅ Should show error: "Please enter a valid YouTube URL"
```

### Test 8: Backend Logs Verification
**Expected Result:** Should see delay messages
```
1. Generate content from 5-video playlist
2. Check backend terminal
3. ✅ Should see logs like:
   - "Fetching transcript 1/5..."
   - "Waiting 5 seconds before next request..."
   - "Successfully fetched X/5 transcripts"
```

## Sample Playlist URLs for Testing

### Small Playlists (Good for Quick Testing)
```
3 videos: https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab
5 videos: https://www.youtube.com/playlist?list=PLpQQipWcxwt9U7qgyYkvNH3Mp8XHXCMmQ
```

### Medium Playlists
```
10-15 videos: https://www.youtube.com/playlist?list=PLBlnK6fEyqRgp46KUv4ZY69yXmpwKOIev
```

### Large Playlists (Test Performance)
```
20+ videos: https://www.youtube.com/playlist?list=PLDoPjvoNmBAzH72MTPuAAaYfReraNlQpK
```

## Common Issues & Solutions

### Issue: "yt-dlp not found"
**Solution:**
```bash
pip install yt-dlp
# or
pip3 install yt-dlp
```

### Issue: Playlist not detected
**Solution:**
- Make sure URL contains `list=` parameter
- Check browser console for errors
- Verify backend is running
- Check backend logs for Python script errors

### Issue: Transcript fetching fails
**Solution:**
- Check if videos have transcripts (auto-generated or manual)
- Try with different playlist
- Check internet connection
- Verify yt-dlp is up to date: `pip install --upgrade yt-dlp`

### Issue: Processing takes too long
**Solution:**
- This is expected for large playlists (5 sec per video)
- Check backend logs to verify it's processing
- For testing, use smaller playlists (3-5 videos)

### Issue: Content not generating
**Solution:**
- Check browser console for errors
- Verify Groq API key is valid
- Check if transcript is empty (backend logs)
- Test with single video first

## Performance Benchmarks

Expected processing times:
- **3 videos**: 15-20 seconds + AI generation (~5-10 sec)
- **5 videos**: 25-30 seconds + AI generation (~5-10 sec)
- **10 videos**: 50-60 seconds + AI generation (~10-15 sec)
- **20 videos**: 100-120 seconds + AI generation (~15-20 sec)

## Testing Checklist

After each backend/frontend restart, verify:
- [ ] Single video URL still works
- [ ] Playlist URL is detected
- [ ] Playlist info displays correctly
- [ ] Video list shows first 10 items
- [ ] Blog generation works for playlist
- [ ] Slides generation works for playlist
- [ ] Quiz generation works for playlist
- [ ] Backend shows 5-second delay messages
- [ ] Content saves to "My Content" tab
- [ ] Dark mode displays correctly

## Debugging Tips

1. **Check Browser Console**: F12 → Console tab
   - Look for API errors
   - Check network requests
   - Verify playlist detection logs

2. **Check Backend Logs**: Terminal running `npm start`
   - Look for Python script output
   - Check transcript fetching messages
   - Verify delay timing

3. **Test Python Scripts Directly**:
   ```bash
   cd backend
   python get_playlist.py "PLAYLIST_URL"
   python get_batch_transcripts.py VIDEO_ID1 VIDEO_ID2 --delay=5
   ```

4. **Network Tab**: F12 → Network tab
   - Monitor `/check-url-type` request
   - Monitor `/generate-from-playlist` request
   - Check response times

## Success Criteria

The feature is working correctly if:
✅ Playlist URL detection is automatic and instant
✅ Playlist info displays with correct video count
✅ All content types generate from playlists
✅ Backend shows 5-second delays in logs
✅ Single video functionality unchanged
✅ Content saves to database correctly
✅ Error handling works for invalid inputs
✅ UI is responsive and user-friendly

## Report Issues

If you encounter any issues:
1. Note the exact playlist URL used
2. Copy error messages from console
3. Copy backend log messages
4. Note the content type attempted (Blog/Slides/etc)
5. Describe expected vs actual behavior
