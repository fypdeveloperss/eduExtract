# YouTube Transcript Fetching with IP Rotation

This document explains how to use the IP rotation features to avoid YouTube rate limiting when fetching transcripts from playlists with 10+ videos.

## Problem
YouTube blocks repeated transcript requests from the same IP address, especially when fetching transcripts from large playlists (10+ videos).

## Solutions Implemented

### 1. **Basic Version** (`get_batch_transcripts.py`)
Enhanced with:
- Retry mechanism (3 attempts per video)
- Randomized delays (to appear more human-like)
- Exponential backoff on failures
- User-agent rotation

**Usage:**
```bash
python get_batch_transcripts.py --delay=8 video_id1 video_id2 video_id3
```

### 2. **Advanced Version** (`get_batch_transcripts_advanced.py`) ⭐ Recommended
Enhanced with:
- Chunked processing (breaks large batches into smaller chunks)
- Extended delays between chunks
- Proxy rotation support
- Better retry logic with exponential backoff
- Progress tracking

**Usage:**
```bash
# Basic usage
python get_batch_transcripts_advanced.py video_id1 video_id2 video_id3

# With custom settings
python get_batch_transcripts_advanced.py --delay=10 --chunk-size=3 video_id1 video_id2 ... video_id20

# With proxy rotation
python get_batch_transcripts_advanced.py --use-proxy --delay=8 --chunk-size=5 video_id1 video_id2 ...
```

**Parameters:**
- `--delay=N`: Base delay in seconds between requests (default: 8)
- `--chunk-size=N`: Number of videos per chunk (default: 5)
- `--use-proxy`: Enable proxy rotation (requires proxy setup)

## IP Rotation Strategies

### Strategy 1: Intelligent Request Spacing (No Setup Required) ✅
The advanced script automatically:
- Processes videos in chunks (default: 5 videos per chunk)
- Adds randomized delays (3-12 seconds between requests)
- Takes extended breaks after each chunk (2x normal delay)
- Increases delays progressively as more requests are made

This is the **easiest and most reliable method** without requiring proxies.

### Strategy 2: Proxy Rotation (Requires Setup)

#### Option A: Free Proxies (Not Recommended)
Free proxies are unreliable and often blocked by YouTube.

1. Edit `proxy_config.py`:
```python
FREE_PROXIES = [
    "http://123.456.789.0:8080",
    "http://98.765.432.1:3128",
]
```

2. Find free proxies at:
   - https://free-proxy-list.net/
   - https://www.sslproxies.org/
   - https://www.proxy-list.download/

#### Option B: Premium Proxy Services (Recommended for Production) ⭐

**Best Options:**
1. **Bright Data (formerly Luminati)** - Most reliable
2. **SmartProxy** - Good balance of price/quality
3. **IPRoyal** - Affordable residential proxies
4. **Oxylabs** - Enterprise-grade

**Setup Example (SmartProxy):**
```python
# In proxy_config.py
PREMIUM_PROXY_SERVICES = {
    "smartproxy": {
        "endpoint": "http://gate.smartproxy.com:7000",
        "username": "your_username",
        "password": "your_password"
    }
}
```

### Strategy 3: VPN Rotation (Manual)
Use a VPN with server rotation:
1. Connect to VPN server (e.g., NordVPN, ExpressVPN)
2. Fetch 5-10 transcripts
3. Disconnect and switch to different VPN server
4. Repeat

This can be automated with VPN APIs, but requires more setup.

## Recommended Approach for 10+ Videos

### For 10-20 videos:
```bash
python get_batch_transcripts_advanced.py --delay=10 --chunk-size=5 video_ids...
```
- Chunk size: 5 videos
- Delay: 10 seconds
- Expected time: ~15-20 minutes

### For 20-50 videos:
```bash
python get_batch_transcripts_advanced.py --delay=12 --chunk-size=4 video_ids...
```
- Chunk size: 4 videos
- Delay: 12 seconds
- Expected time: ~30-45 minutes

### For 50+ videos (Use with Proxies):
```bash
python get_batch_transcripts_advanced.py --use-proxy --delay=8 --chunk-size=5 video_ids...
```
- Enable proxy rotation
- Chunk size: 5 videos
- Delay: 8 seconds
- Requires premium proxy service

## Testing Proxy Setup

Test if your proxy is working:
```bash
python -c "from proxy_config import test_proxy; print(test_proxy('http://your_proxy:port'))"
```

## Troubleshooting

### Still Getting Blocked?
1. **Increase delay**: Use `--delay=15` or higher
2. **Reduce chunk size**: Use `--chunk-size=3`
3. **Add manual breaks**: Process 20 videos, wait 30 minutes, process next 20
4. **Use premium proxies**: Free proxies rarely work with YouTube

### Error: "No transcript available"
- The video might not have transcripts
- Try different language codes
- Some videos have transcripts disabled by uploader

### Proxy Not Working?
- Test proxy with `test_proxy()` function
- Free proxies often don't work with YouTube
- Consider premium proxy service

## Alternative: Split Processing
Instead of fetching all transcripts at once:

1. **Morning batch**: Fetch 10 videos
2. **Wait 2-3 hours**
3. **Afternoon batch**: Fetch next 10 videos
4. **Wait overnight**
5. **Next day**: Fetch remaining videos

This mimics natural human behavior and is least likely to be blocked.

## Cost Comparison

| Method | Cost | Reliability | Setup Difficulty |
|--------|------|-------------|------------------|
| Intelligent Spacing | Free | High | None |
| Free Proxies | Free | Very Low | Easy |
| Premium Proxies | $50-200/mo | Very High | Medium |
| VPN Rotation | $10-15/mo | Medium | Easy-Medium |
| Manual Splitting | Free | High | None |

## Recommendation

For most users: **Use the advanced script with intelligent spacing** (no proxies needed)
- Set `--delay=12` and `--chunk-size=4`
- Be patient - it's better to wait than get blocked
- For 50+ videos, consider splitting into multiple sessions

For production/automation: **Use premium proxy service**
- More reliable than free solutions
- Faster processing
- Better for large-scale operations
