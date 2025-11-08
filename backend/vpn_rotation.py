"""
VPN Rotation Script
This is a practical solution that actually works for IP rotation
"""

import subprocess
import time
import sys

# List of VPN server locations (configure based on your VPN provider)
VPN_SERVERS = [
    "US-NewYork",
    "UK-London", 
    "Germany-Berlin",
    "Canada-Toronto",
    "Australia-Sydney"
]

def connect_vpn(server_location):
    """
    Connect to VPN server
    Modify this based on your VPN provider's CLI
    
    Examples:
    - NordVPN: nordvpn connect US
    - ExpressVPN: expressvpn connect "USA - New York"
    - ProtonVPN: protonvpn connect --cc US
    """
    try:
        # Example for NordVPN
        result = subprocess.run(
            ['nordvpn', 'connect', server_location],
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode == 0
    except:
        return False

def disconnect_vpn():
    """Disconnect from VPN"""
    try:
        subprocess.run(['nordvpn', 'disconnect'], timeout=10)
        return True
    except:
        return False

def fetch_with_vpn_rotation(video_ids, videos_per_vpn=5):
    """
    Fetch transcripts with VPN rotation
    
    Args:
        video_ids: List of video IDs
        videos_per_vpn: How many videos to fetch before switching VPN
    """
    results = {}
    vpn_index = 0
    
    for i, video_id in enumerate(video_ids):
        # Switch VPN every N videos
        if i % videos_per_vpn == 0:
            server = VPN_SERVERS[vpn_index % len(VPN_SERVERS)]
            print(f"Switching to VPN: {server}")
            
            disconnect_vpn()
            time.sleep(5)  # Wait for disconnect
            
            if connect_vpn(server):
                print(f"Connected to {server}")
                time.sleep(10)  # Wait for connection to stabilize
            else:
                print(f"Failed to connect to {server}, continuing anyway...")
            
            vpn_index += 1
        
        # Now fetch transcript with new IP
        # ... use regular fetch here ...
        
    disconnect_vpn()
    return results

# Usage:
# python vpn_rotation.py video_id1 video_id2 ... video_id20
