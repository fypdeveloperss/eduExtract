#!/usr/bin/env python3
"""
Playlist Information Extractor
Extracts all video IDs and metadata from a YouTube playlist without using API
"""

import sys
import json
import yt_dlp

def get_playlist_videos(playlist_url):
    """
    Extract all video IDs and metadata from a YouTube playlist
    
    Args:
        playlist_url: YouTube playlist URL
        
    Returns:
        dict: Playlist information including video IDs, titles, and metadata
    """
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,  # Don't download, just get metadata
            'force_generic_extractor': False,
            'ignoreerrors': True,  # Continue on errors
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(playlist_url, download=False)
            
            if not info:
                return {
                    'success': False,
                    'error': 'Could not extract playlist information'
                }
            
            result = {
                'success': True,
                'playlist_title': info.get('title', 'Unknown Playlist'),
                'playlist_id': info.get('id', ''),
                'uploader': info.get('uploader', 'Unknown'),
                'video_count': 0,
                'videos': []
            }
            
            # Extract video information
            if 'entries' in info:
                for idx, entry in enumerate(info['entries']):
                    if entry:  # Sometimes entries can be None for unavailable videos
                        video_info = {
                            'id': entry.get('id', ''),
                            'title': entry.get('title', 'Unknown Title'),
                            'duration': entry.get('duration', 0),
                            'position': idx + 1,
                            'url': f"https://www.youtube.com/watch?v={entry.get('id', '')}"
                        }
                        result['videos'].append(video_info)
                
                result['video_count'] = len(result['videos'])
            
            return result
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """Main entry point for the script"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'No playlist URL provided'
        }))
        sys.exit(1)
    
    playlist_url = sys.argv[1]
    
    # Validate URL
    if 'list=' not in playlist_url:
        print(json.dumps({
            'success': False,
            'error': 'Invalid playlist URL. Must contain "list=" parameter.'
        }))
        sys.exit(1)
    
    result = get_playlist_videos(playlist_url)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
