#!/usr/bin/env python3
"""
Advanced Batch Transcript Fetcher with Multiple IP Rotation Strategies
Supports: Proxy rotation, Request spacing, User-agent rotation, and Chunking
"""

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
import sys
import json
import time
import random
import os

try:
    from proxy_config import get_proxy_list
    PROXY_LIST = get_proxy_list()
except ImportError:
    PROXY_LIST = []

# User agents for rotation to avoid detection
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Edge/120.0.0.0',
]

class TranscriptFetcher:
    """Advanced transcript fetcher with multiple strategies to avoid rate limiting"""
    
    def __init__(self, use_proxy=False, chunk_size=5, base_delay=8):
        self.use_proxy = use_proxy
        self.chunk_size = chunk_size  # Process videos in chunks
        self.base_delay = base_delay
        self.proxy_index = 0
        self.request_count = 0
        
    def get_next_proxy(self):
        """Get next proxy from the list in round-robin fashion"""
        if not PROXY_LIST:
            return None
        proxy = PROXY_LIST[self.proxy_index % len(PROXY_LIST)]
        self.proxy_index += 1
        return proxy
    
    def get_random_user_agent(self):
        """Get a random user agent"""
        return random.choice(USER_AGENTS)
    
    def calculate_delay(self, attempt=0):
        """
        Calculate delay with randomization and exponential backoff
        - Adds randomness to appear human-like
        - Increases delay after every 5 requests
        - Applies exponential backoff on retries
        """
        # Base delay increases after every chunk
        chunk_multiplier = 1 + (self.request_count // self.chunk_size) * 0.5
        
        # Add random variation (-2 to +4 seconds)
        random_delay = random.uniform(-2, 4)
        
        # Exponential backoff on retries
        retry_multiplier = 1 + (attempt * 0.5)
        
        total_delay = (self.base_delay * chunk_multiplier * retry_multiplier) + random_delay
        return max(3, total_delay)  # Minimum 3 seconds
    
    def fetch_single_transcript(self, video_id, retry_count=3):
        """
        Fetch transcript for a single video with advanced retry logic
        
        Args:
            video_id: YouTube video ID
            retry_count: Number of retries on failure
            
        Returns:
            dict: Contains success status and transcript text or error
        """
        last_error = None
        
        for attempt in range(retry_count):
            try:
                # Rotate proxy on each attempt if enabled
                if self.use_proxy and PROXY_LIST:
                    proxy = self.get_next_proxy()
                    print(f"Attempt {attempt + 1}: Using proxy rotation", file=sys.stderr, flush=True)
                    # Note: youtube_transcript_api doesn't natively support proxies
                    # For true proxy support, you'd need to modify the library or use environment variables
                    os.environ['HTTP_PROXY'] = proxy
                    os.environ['HTTPS_PROXY'] = proxy
                
                # Try to fetch transcript
                transcript_list = None
                
                # Method 1: Try standard method
                try:
                    transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
                except Exception as e1:
                    # Method 2: Try with language preferences
                    try:
                        transcript_list = YouTubeTranscriptApi.get_transcript(
                            video_id, 
                            languages=['en', 'en-US', 'en-GB', 'auto']
                        )
                    except Exception as e2:
                        # Method 3: Try to list available transcripts
                        try:
                            transcript_list_data = YouTubeTranscriptApi.list_transcripts(video_id)
                            # Get first available transcript
                            transcript = next(iter(transcript_list_data))
                            transcript_list = transcript.fetch()
                        except Exception as e3:
                            raise e3
                
                if transcript_list is None or len(transcript_list) == 0:
                    raise Exception("No transcript data retrieved")
                
                # Extract text from transcript
                full_transcript_text = ""
                
                if isinstance(transcript_list[0], dict) and 'text' in transcript_list[0]:
                    # Dictionary format
                    full_transcript_text = " ".join([snippet['text'] for snippet in transcript_list])
                elif hasattr(transcript_list[0], 'text'):
                    # Object format
                    full_transcript_text = " ".join([segment.text for segment in transcript_list])
                else:
                    # Fallback
                    full_transcript_text = " ".join([str(segment) for segment in transcript_list])
                
                self.request_count += 1
                
                return {
                    'success': True,
                    'video_id': video_id,
                    'text': full_transcript_text,
                    'segment_count': len(transcript_list),
                    'attempt': attempt + 1
                }
                
            except (TranscriptsDisabled, NoTranscriptFound) as e:
                # These errors won't benefit from retry
                return {
                    'success': False,
                    'video_id': video_id,
                    'error': f"No transcript available: {str(e)}",
                    'error_type': type(e).__name__
                }
            except Exception as e:
                last_error = e
                if attempt < retry_count - 1:
                    wait_time = self.calculate_delay(attempt)
                    print(f"Attempt {attempt + 1} failed for {video_id}: {str(e)}", 
                          file=sys.stderr, flush=True)
                    print(f"Retrying in {wait_time:.1f}s...", file=sys.stderr, flush=True)
                    time.sleep(wait_time)
                continue
            finally:
                # Clear proxy environment variables
                if 'HTTP_PROXY' in os.environ:
                    del os.environ['HTTP_PROXY']
                if 'HTTPS_PROXY' in os.environ:
                    del os.environ['HTTPS_PROXY']
        
        return {
            'success': False,
            'video_id': video_id,
            'error': str(last_error),
            'error_type': type(last_error).__name__,
            'attempts': retry_count
        }
    
    def fetch_batch(self, video_ids):
        """
        Fetch transcripts for multiple videos with intelligent spacing
        
        Args:
            video_ids: List of YouTube video IDs
            
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
            print(f"\nProcessing video {idx + 1}/{len(video_ids)}: {video_id}", 
                  file=sys.stderr, flush=True)
            
            # Fetch transcript
            result = self.fetch_single_transcript(video_id)
            results['transcripts'][video_id] = result
            
            if result['success']:
                results['successful'] += 1
                print(f"✓ Success: {video_id}", file=sys.stderr, flush=True)
            else:
                results['failed'] += 1
                print(f"✗ Failed: {video_id} - {result.get('error', 'Unknown error')}", 
                      file=sys.stderr, flush=True)
            
            # Add delay between requests (except for the last one)
            if idx < len(video_ids) - 1:
                # Extra long delay every chunk_size videos
                if (idx + 1) % self.chunk_size == 0:
                    chunk_delay = self.calculate_delay() * 2
                    print(f"\n{'='*50}", file=sys.stderr, flush=True)
                    print(f"Chunk complete ({idx + 1} videos). Taking extended break...", 
                          file=sys.stderr, flush=True)
                    print(f"Waiting {chunk_delay:.1f} seconds before next chunk", 
                          file=sys.stderr, flush=True)
                    print(f"{'='*50}\n", file=sys.stderr, flush=True)
                    time.sleep(chunk_delay)
                else:
                    delay = self.calculate_delay()
                    print(f"Waiting {delay:.1f} seconds...", file=sys.stderr, flush=True)
                    time.sleep(delay)
        
        return results

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python get_batch_transcripts_advanced.py [--delay=N] [--chunk-size=N] [--use-proxy] video_id1 video_id2 ...'
        }))
        sys.exit(1)
    
    # Parse arguments
    video_ids = []
    base_delay = 8
    chunk_size = 5
    use_proxy = False
    
    for arg in sys.argv[1:]:
        if arg.startswith('--delay='):
            try:
                base_delay = int(arg.split('=')[1])
            except:
                pass
        elif arg.startswith('--chunk-size='):
            try:
                chunk_size = int(arg.split('=')[1])
            except:
                pass
        elif arg == '--use-proxy':
            use_proxy = True
        else:
            video_ids.append(arg)
    
    if not video_ids:
        print(json.dumps({
            'success': False,
            'error': 'No video IDs provided'
        }))
        sys.exit(1)
    
    # Create fetcher and process videos
    fetcher = TranscriptFetcher(
        use_proxy=use_proxy,
        chunk_size=chunk_size,
        base_delay=base_delay
    )
    
    print(f"\nStarting batch transcript fetch:", file=sys.stderr, flush=True)
    print(f"- Total videos: {len(video_ids)}", file=sys.stderr, flush=True)
    print(f"- Base delay: {base_delay}s", file=sys.stderr, flush=True)
    print(f"- Chunk size: {chunk_size}", file=sys.stderr, flush=True)
    print(f"- Proxy enabled: {use_proxy}", file=sys.stderr, flush=True)
    if use_proxy:
        print(f"- Available proxies: {len(PROXY_LIST)}", file=sys.stderr, flush=True)
    print("", file=sys.stderr, flush=True)
    
    results = fetcher.fetch_batch(video_ids)
    
    # Output results
    print(f"\n{'='*50}", file=sys.stderr, flush=True)
    print(f"Batch complete!", file=sys.stderr, flush=True)
    print(f"Successful: {results['successful']}/{results['total']}", file=sys.stderr, flush=True)
    print(f"Failed: {results['failed']}/{results['total']}", file=sys.stderr, flush=True)
    print(f"{'='*50}\n", file=sys.stderr, flush=True)
    
    print(json.dumps(results, ensure_ascii=False))

if __name__ == '__main__':
    main()
