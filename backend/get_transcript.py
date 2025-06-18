from youtube_transcript_api import YouTubeTranscriptApi
import sys

# Get video ID from command-line arguments
if len(sys.argv) < 2:
    print("Usage: python get_transcript.py <video_id>", file=sys.stderr)
    sys.exit(1)

video_id = sys.argv[1]

try:
    # Fetch transcript
    transcript_list = YouTubeTranscriptApi.get_transcript(video_id)

    # Join all text snippets into a single string
    full_transcript_text = " ".join([snippet['text'] for snippet in transcript_list])
    
    # Print the full transcript text to stdout
    print(full_transcript_text)

except Exception as e:
    # Removed emoji from the error message to prevent UnicodeEncodeError
    print(f"Error fetching transcript: {e}", file=sys.stderr)
    sys.exit(1)
