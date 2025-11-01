#!/usr/bin/env python3
"""
Batch Transcript Fetcher
Fetches transcripts for multiple YouTube videos with delay to avoid rate limiting
"""

from youtube_transcript_api import YouTubeTranscriptApi
import sys
import json
import time

def fetch_single_transcript(video_id):
    """
    Fetch transcript for a single video
    
    Args:
        video_id: YouTube video ID
        
    Returns:
        dict: Contains success status and transcript text or error
    """
    try:
        # Try different API approaches
        transcript_list = None
        
        # Method 1: Try the newer API with instance
        try:
            api = YouTubeTranscriptApi()
            transcript_list = api.fetch(video_id)
        except Exception as e1:
            # Method 2: Try the older method
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            except Exception as e2:
                raise e2
        
        if transcript_list is None:
            raise Exception("Failed to fetch transcript using any available method")
        
        # Handle different transcript data structures
        full_transcript_text = ""
        
        if transcript_list and len(transcript_list) > 0:
            first_segment = transcript_list[0]
            
            # Try different ways to access the text
            if hasattr(first_segment, 'text'):
                # New API object with .text attribute
                full_transcript_text = " ".join([segment.text for segment in transcript_list])
            elif isinstance(first_segment, dict) and 'text' in first_segment:
                # Old API dictionary with 'text' key
                full_transcript_text = " ".join([snippet['text'] for snippet in transcript_list])
            else:
                # Try to convert to string directly
                full_transcript_text = " ".join([str(segment) for segment in transcript_list])
        
        return {
            'success': True,
            'video_id': video_id,
            'text': full_transcript_text,
            'segment_count': len(transcript_list)
        }
        
    except Exception as e:
        return {
            'success': False,
            'video_id': video_id,
            'error': str(e),
            'error_type': type(e).__name__
        }

def fetch_batch_transcripts(video_ids, delay_seconds=5):
    """
    Fetch transcripts for multiple videos with delay between requests
    
    Args:
        video_ids: List of YouTube video IDs
        delay_seconds: Delay in seconds between requests (default: 5)
        
    Returns:
        dict: Results for all videos
    """
    results = {
        'total': len(video_ids),
        'successful': 0,
        'failed': 0,
        'transcripts': {}
    }
    
    for idx, video_id in enumerate(video_ids):
        # Fetch transcript
        result = fetch_single_transcript(video_id)
        results['transcripts'][video_id] = result
        
        if result['success']:
            results['successful'] += 1
        else:
            results['failed'] += 1
        
        # Print progress to stderr for Node.js to track
        print(f"Progress: {idx + 1}/{len(video_ids)} videos processed", file=sys.stderr, flush=True)
        
        # Add delay between requests (except for the last one)
        if idx < len(video_ids) - 1:
            print(f"Waiting {delay_seconds} seconds before next request...", file=sys.stderr, flush=True)
            time.sleep(delay_seconds)
    
    return results

def main():
    """Main entry point for the script"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'No video IDs provided'
        }))
        sys.exit(1)
    
    # Get video IDs from command line arguments
    video_ids = sys.argv[1:]
    
    # Check if delay parameter is provided (format: --delay=5)
    delay_seconds = 5  # default
    filtered_video_ids = []
    
    for arg in video_ids:
        if arg.startswith('--delay='):
            try:
                delay_seconds = int(arg.split('=')[1])
            except:
                pass  # Use default if parsing fails
        else:
            filtered_video_ids.append(arg)
    
    video_ids = filtered_video_ids
    
    if not video_ids:
        print(json.dumps({
            'success': False,
            'error': 'No valid video IDs provided'
        }))
        sys.exit(1)
    
    # Fetch transcripts
    results = fetch_batch_transcripts(video_ids, delay_seconds)
    
    # Output results as JSON
    print(json.dumps(results, ensure_ascii=False))

if __name__ == '__main__':
    main()
