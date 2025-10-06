from youtube_transcript_api import YouTubeTranscriptApi
import sys

# Get video ID from command-line arguments
if len(sys.argv) < 2:
    print("Usage: python get_transcript.py <video_id>", file=sys.stderr)
    sys.exit(1)

video_id = sys.argv[1]

try:
    print(f"Attempting to fetch transcript for video ID: {video_id}", file=sys.stderr)
    
    # Try different API approaches
    transcript_list = None
    
    # Method 1: Try the newer API with instance
    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.fetch(video_id)
        print(f"Successfully fetched transcript with {len(transcript_list)} segments using instance.fetch()", file=sys.stderr)
    except Exception as e1:
        print(f"Instance.fetch() failed: {e1}", file=sys.stderr)
        
        # Method 2: Try the older method
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            print(f"Successfully fetched transcript with {len(transcript_list)} segments using get_transcript()", file=sys.stderr)
        except Exception as e2:
            print(f"get_transcript() failed: {e2}", file=sys.stderr)
            raise e2
    
    if transcript_list is None:
        raise Exception("Failed to fetch transcript using any available method")
    
    # Handle different transcript data structures
    full_transcript_text = ""
    
    # Debug: Print the first transcript object structure
    if transcript_list and len(transcript_list) > 0:
        first_segment = transcript_list[0]
        print(f"First segment type: {type(first_segment)}", file=sys.stderr)
        print(f"First segment attributes: {dir(first_segment)}", file=sys.stderr)
        
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
    
    # Print the full transcript text to stdout
    print(full_transcript_text)

except Exception as e:
    # Print detailed error information
    print(f"Error fetching transcript: {e}", file=sys.stderr)
    print(f"Error type: {type(e).__name__}", file=sys.stderr)
    
    # Try to get more specific error information
    if hasattr(e, '__cause__') and e.__cause__:
        print(f"Caused by: {e.__cause__}", file=sys.stderr)
    
    sys.exit(1)
