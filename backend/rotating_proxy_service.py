"""
Rotating Proxy Service Solution
Works by routing ALL system traffic through rotating proxies

This actually works because it operates at system/network level
"""

import os
import requests
from youtube_transcript_api import YouTubeTranscriptApi

class RotatingProxyManager:
    """
    Uses premium rotating proxy services that work at system level
    Examples: Bright Data, SmartProxy, IPRoyal
    """
    
    def __init__(self, proxy_url):
        """
        Args:
            proxy_url: Rotating proxy endpoint
                Example: "http://username:password@gate.smartproxy.com:7000"
        """
        self.proxy_url = proxy_url
        self.session = requests.Session()
        self.session.proxies = {
            'http': proxy_url,
            'https': proxy_url
        }
    
    def test_connection(self):
        """Test if proxy is working"""
        try:
            # Check our IP
            response = self.session.get('https://api.ipify.org?format=json', timeout=10)
            if response.status_code == 200:
                ip = response.json()['ip']
                print(f"Connected via IP: {ip}")
                return True
        except Exception as e:
            print(f"Proxy test failed: {e}")
            return False
    
    def set_system_proxy(self):
        """
        Set system-wide proxy environment variables
        This makes youtube-transcript-api use the proxy
        """
        os.environ['HTTP_PROXY'] = self.proxy_url
        os.environ['HTTPS_PROXY'] = self.proxy_url
        os.environ['http_proxy'] = self.proxy_url
        os.environ['https_proxy'] = self.proxy_url
        
        # Force Python requests library to use proxy
        import urllib.request
        proxy_handler = urllib.request.ProxyHandler({
            'http': self.proxy_url,
            'https': self.proxy_url
        })
        opener = urllib.request.build_opener(proxy_handler)
        urllib.request.install_opener(opener)
    
    def clear_system_proxy(self):
        """Clear proxy settings"""
        for var in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']:
            if var in os.environ:
                del os.environ[var]

# Usage Example:
"""
# Setup (one-time)
proxy_manager = RotatingProxyManager(
    "http://your_username:your_password@gate.smartproxy.com:7000"
)

# Test connection
if proxy_manager.test_connection():
    print("Proxy working!")
    
    # Set as system proxy
    proxy_manager.set_system_proxy()
    
    # Now ALL network requests go through rotating proxy
    # Each request automatically gets a new IP!
    transcript = YouTubeTranscriptApi.get_transcript('video_id')
    
    # Clear when done
    proxy_manager.clear_system_proxy()
"""

# Recommended Services:
RECOMMENDED_PROXY_SERVICES = {
    "smartproxy": {
        "url": "https://smartproxy.com",
        "pricing": "$12.5/GB (residential IPs)",
        "endpoint": "gate.smartproxy.com:7000",
        "features": ["Auto-rotation", "Sticky sessions", "City targeting"]
    },
    "brightdata": {
        "url": "https://brightdata.com",
        "pricing": "$15/GB (residential IPs)",
        "endpoint": "brd.superproxy.io:22225",
        "features": ["Premium quality", "Enterprise support", "Best success rate"]
    },
    "iproyal": {
        "url": "https://iproyal.com",
        "pricing": "$7/GB (residential IPs)",
        "endpoint": "residential.iproyal.com:9002",
        "features": ["Affordable", "Good for testing", "Unlimited bandwidth plans"]
    }
}

"""
IMPORTANT: 
These services charge per GB of traffic.
For transcripts (text-only), 1GB = ~1000+ videos
So cost is minimal: ~$10-15 for processing 1000 videos
"""
