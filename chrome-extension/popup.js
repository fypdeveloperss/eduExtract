// Configuration
const API_BASE_URL = 'http://localhost:5000'; // Change to your deployed URL
const FRONTEND_URL = 'http://localhost:5173'; // Change to your deployed URL

// Get current tab info
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Extract video ID from YouTube URL
function extractYouTubeVideoId(url) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Check if URL is a playlist
function isPlaylistUrl(url) {
  return url.includes('list=');
}

// Initialize popup
async function init() {
  const tab = await getCurrentTab();
  
  // Update page info
  document.getElementById('pageTitle').textContent = tab.title || 'Current Page';
  document.getElementById('pageUrl').textContent = new URL(tab.url).hostname;
  
  // Check if YouTube
  const isYouTube = tab.url.includes('youtube.com');
  const videoId = extractYouTubeVideoId(tab.url);
  const isPlaylist = isPlaylistUrl(tab.url);
  
  if (isYouTube) {
    document.querySelector('.info-icon').textContent = '📺';
    if (isPlaylist) {
      document.getElementById('pageTitle').textContent = 'YouTube Playlist Detected';
    } else if (videoId) {
      document.getElementById('pageTitle').textContent = 'YouTube Video Detected';
    }
  } else {
    document.querySelector('.info-icon').textContent = '🌐';
  }
  
  // Store current URL in chrome storage
  chrome.storage.local.set({ currentUrl: tab.url });
}

// Show status message
function showStatus(message, type = 'info') {
  const status = document.getElementById('status');
  const statusMessage = document.getElementById('statusMessage');
  const statusIcon = document.querySelector('.status-icon');
  
  status.classList.remove('hidden', 'success', 'error');
  
  if (type === 'success') {
    status.classList.add('success');
    statusIcon.textContent = '✅';
  } else if (type === 'error') {
    status.classList.add('error');
    statusIcon.textContent = '❌';
  } else {
    statusIcon.textContent = '⏳';
  }
  
  statusMessage.textContent = message;
}

// Generate content
async function generateContent(type) {
  const tab = await getCurrentTab();
  const isYouTube = tab.url.includes('youtube.com');
  
  if (!isYouTube) {
    showStatus('Please navigate to a YouTube video first', 'error');
    setTimeout(() => {
      document.getElementById('status').classList.add('hidden');
    }, 3000);
    return;
  }
  
  showStatus(`Generating ${type}...`, 'info');
  
  // Open dashboard with the URL and content type
  const dashboardUrl = `${FRONTEND_URL}/dashboard?url=${encodeURIComponent(tab.url)}&type=${type}`;
  chrome.tabs.create({ url: dashboardUrl });
  
  showStatus(`Opening dashboard to generate ${type}`, 'success');
  setTimeout(() => window.close(), 1000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  init();
  
  // Quick action buttons
  document.getElementById('generateSummary').addEventListener('click', () => {
    generateContent('summary');
  });
  
  document.getElementById('generateBlog').addEventListener('click', () => {
    generateContent('blog');
  });
  
  document.getElementById('generateSlides').addEventListener('click', () => {
    generateContent('slides');
  });
  
  document.getElementById('generateQuiz').addEventListener('click', () => {
    generateContent('quiz');
  });
  
  document.getElementById('generateFlashcards').addEventListener('click', () => {
    generateContent('flashcards');
  });
  
  document.getElementById('openDashboard').addEventListener('click', async () => {
    const tab = await getCurrentTab();
    chrome.tabs.create({ url: `${FRONTEND_URL}/dashboard?url=${encodeURIComponent(tab.url)}` });
    window.close();
  });
  
  document.getElementById('openFullApp').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: FRONTEND_URL });
    window.close();
  });
});
