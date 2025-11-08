# Dashboard URL Parameter Handler

Add this code to your Dashboard.jsx to handle URLs from the Chrome extension.

## Add to Dashboard.jsx

Add this useEffect hook after your existing useEffect hooks (around line 150):

```javascript
// Handle URL parameters from Chrome extension
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get('url');
  const typeParam = params.get('type');
  
  if (urlParam) {
    // Set the URL and process it
    setUrl(urlParam);
    setUploadMode('youtube');
    
    // Extract video ID and set original source
    const videoId = extractVideoId(urlParam);
    if (videoId) {
      setVideoId(videoId);
      setOriginalSourceContent({
        type: 'youtube',
        url: urlParam,
        videoId: videoId,
        content: null
      });
      
      // Process the URL
      handleUrlSubmit(urlParam);
      
      // If a specific type was requested, trigger that generation
      if (typeParam && ['blog', 'slides', 'flashcards', 'quiz', 'summary'].includes(typeParam)) {
        setTimeout(() => {
          handleTabClick(typeParam);
        }, 2000); // Wait for video to load
      }
    }
    
    // Clear URL parameters after processing
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, []);
```

## Alternative: Add to existing useEffect

If you already have a useEffect that runs on mount, add this logic there:

```javascript
// Inside your existing useEffect(() => { ... }, [])
const checkUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get('url');
  const typeParam = params.get('type');
  
  if (urlParam) {
    console.log('Chrome extension URL detected:', urlParam);
    console.log('Requested type:', typeParam);
    
    // Auto-fill and process
    setUrl(urlParam);
    handleModalSubmit({ type: 'url', content: urlParam });
    
    // Auto-generate if type specified
    if (typeParam) {
      setTimeout(() => {
        setActiveTab(typeParam);
        handleTabClick(typeParam);
      }, 2000);
    }
  }
};

checkUrlParams();
```

## How It Works

1. **Extension sends URL**: `http://localhost:5173/dashboard?url=YOUTUBE_URL&type=summary`
2. **Dashboard reads params**: Extracts URL and type from query string
3. **Auto-processes**: Loads video and optionally generates content
4. **Cleans up**: Removes params from URL for clean browsing

## Testing

1. Load extension in Chrome
2. Go to YouTube video
3. Click extension → "Summary"
4. Dashboard should:
   - Load automatically
   - Show video
   - Start generating summary

## URL Examples

From extension, these URLs will be created:

```
# Just load video
http://localhost:5173/dashboard?url=https://www.youtube.com/watch?v=VIDEO_ID

# Load and generate summary
http://localhost:5173/dashboard?url=https://www.youtube.com/watch?v=VIDEO_ID&type=summary

# Load and generate blog
http://localhost:5173/dashboard?url=https://www.youtube.com/watch?v=VIDEO_ID&type=blog

# Load and generate quiz
http://localhost:5173/dashboard?url=https://www.youtube.com/watch?v=VIDEO_ID&type=quiz
```

## Notes

- URL parameters are automatically cleared after processing
- This prevents confusion if user shares the URL
- Works seamlessly with existing Dashboard functionality
- No breaking changes to current code
