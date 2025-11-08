"""
Proxy Configuration for IP Rotation
Add your proxy servers here to enable IP rotation for YouTube transcript fetching
"""

# Free proxy list (update with working proxies)
# You can get free proxies from:
# - https://free-proxy-list.net/
# - https://www.proxy-list.download/
# - https://www.sslproxies.org/
FREE_PROXIES = [
    # Format: "http://ip:port" or "https://ip:port"
    # Example:
    # "http://123.456.789.0:8080",
    # "http://98.765.432.1:3128",
]

# Premium proxy services (recommended for production)
# These are more reliable than free proxies
PREMIUM_PROXY_SERVICES = {
    # Rotating proxy API endpoints
    # Example for SmartProxy:
    # "smartproxy": {
    #     "endpoint": "http://gate.smartproxy.com:7000",
    #     "username": "your_username",
    #     "password": "your_password"
    # },
    # Example for Bright Data (formerly Luminati):
    # "brightdata": {
    #     "endpoint": "http://brd.superproxy.io:22225",
    #     "username": "your_username",
    #     "password": "your_password"
    # },
}

def get_proxy_list():
    """Get the list of available proxies"""
    proxies = []
    
    # Add free proxies
    proxies.extend(FREE_PROXIES)
    
    # Add premium proxy services
    for service_name, config in PREMIUM_PROXY_SERVICES.items():
        if "endpoint" in config:
            proxy_url = config["endpoint"]
            if "username" in config and "password" in config:
                # Format: http://username:password@endpoint
                proxy_url = proxy_url.replace("http://", f"http://{config['username']}:{config['password']}@")
                proxy_url = proxy_url.replace("https://", f"https://{config['username']}:{config['password']}@")
            proxies.append(proxy_url)
    
    return proxies

def test_proxy(proxy_url):
    """
    Test if a proxy is working
    Returns True if proxy works, False otherwise
    """
    import requests
    try:
        response = requests.get(
            "https://api.ipify.org?format=json",
            proxies={"http": proxy_url, "https": proxy_url},
            timeout=10
        )
        return response.status_code == 200
    except:
        return False
