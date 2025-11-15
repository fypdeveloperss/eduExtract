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

// Check if URL is a PDF or document
function isDocumentUrl(url) {
  const documentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.pptx', '.ppt'];
  const lowerUrl = url.toLowerCase();
  return documentExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('application/pdf') ||
         lowerUrl.includes('application/msword') ||
         lowerUrl.includes('application/vnd.openxmlformats');
}

// Check if URL is a local file (file:// protocol)
function isLocalFileUrl(url) {
  return url.startsWith('file://') || url.startsWith('file:///');
}

// Download file and convert to base64
async function downloadAndProcessFile(url, fileName) {
  try {
    showStatus('Downloading file...', 'info');
    
    // For local files, we need to use a different approach
    if (isLocalFileUrl(url)) {
      // For local files, we can't directly download via fetch
      // We'll need to use the downloads API to copy it
      showStatus('Processing local file...', 'info');
      
      // Try to fetch the file using the tab's content
      const tab = await getCurrentTab();
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          // Try to get file content from the page
          try {
            const response = await fetch(window.location.href);
            const blob = await response.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            return null;
          }
        }
      });
      
      if (result && result[0] && result[0].result) {
        return {
          name: fileName,
          type: 'application/pdf',
          size: 0, // Will be calculated
          data: result[0].result
        };
      }
      
      throw new Error('Cannot access local file. Please use a web URL or upload manually.');
    }
    
    // For web URLs, download the file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Check file size (10MB limit)
    if (blob.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit.');
    }
    
    // Convert to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          name: fileName || url.split('/').pop() || 'document.pdf',
          type: blob.type || 'application/pdf',
          size: blob.size,
          data: reader.result
        });
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const status = document.getElementById('status');
  const statusMessage = document.getElementById('statusMessage');
  const statusIcon = document.getElementById('statusIcon');
  
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

// Initialize popup
async function init() {
  const tab = await getCurrentTab();
  
  // Check page type first
  const isYouTube = tab.url.includes('youtube.com');
  const videoId = extractYouTubeVideoId(tab.url);
  const isPlaylist = isPlaylistUrl(tab.url);
  const isDocument = isDocumentUrl(tab.url);
  const isLocalFile = isLocalFileUrl(tab.url);
  
  // Update page info
  document.getElementById('pageTitle').textContent = tab.title || 'Current Page';
  
  // Handle file:// URLs differently
  let pageUrlText = '...';
  try {
    if (isLocalFile) {
      // Extract filename from file:// URL
      const filePath = tab.url.replace(/^file:\/\/\/?/, '');
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'Local File';
      pageUrlText = fileName;
    } else {
      pageUrlText = new URL(tab.url).hostname;
    }
  } catch (e) {
    pageUrlText = tab.url.substring(0, 50) + (tab.url.length > 50 ? '...' : '');
  }
  document.getElementById('pageUrl').textContent = pageUrlText;
  
  // Show/hide sections based on page type
  const quickActions = document.getElementById('quickActions');
  
  if (isYouTube) {
    document.getElementById('infoIcon').textContent = '📺';
    if (isPlaylist) {
      document.getElementById('pageTitle').textContent = 'YouTube Playlist Detected';
    } else if (videoId) {
      document.getElementById('pageTitle').textContent = 'YouTube Video Detected';
    }
    quickActions.classList.remove('hidden');
  } else if (isDocument) {
    document.getElementById('infoIcon').textContent = '📄';
    if (isLocalFile) {
      document.getElementById('pageTitle').textContent = 'Local Document Detected';
    } else {
      document.getElementById('pageTitle').textContent = 'Document Detected';
    }
    quickActions.classList.remove('hidden');
  } else {
    document.getElementById('infoIcon').textContent = '🌐';
    quickActions.classList.remove('hidden');
  }
  
  // Store current URL in chrome storage
  chrome.storage.local.set({ currentUrl: tab.url });
}

// Generate content
async function generateContent(type) {
  const tab = await getCurrentTab();
  const isYouTube = tab.url.includes('youtube.com');
  const isDocument = isDocumentUrl(tab.url);
  const isLocalFile = isLocalFileUrl(tab.url);
  
  // Handle YouTube
  if (isYouTube) {
    showStatus(`Generating ${type}...`, 'info');
    const dashboardUrl = `${FRONTEND_URL}/dashboard?url=${encodeURIComponent(tab.url)}&type=${type}`;
    chrome.tabs.create({ url: dashboardUrl });
    showStatus(`Opening dashboard to generate ${type}`, 'success');
    setTimeout(() => window.close(), 1000);
    return;
  }
  
  // Handle document (PDF, DOCX, etc.) - download and process
  if (isDocument) {
    try {
      showStatus(`Downloading and processing document...`, 'info');
      
      // Extract filename
      let fileName = tab.title || 'document';
      if (isLocalFile) {
        const filePath = tab.url.replace(/^file:\/\/\/?/, '');
        fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'document';
      } else {
        fileName = tab.url.split('/').pop() || tab.title || 'document';
      }
      
      // Download and process file
      const fileData = await downloadAndProcessFile(tab.url, fileName);
      
      // Store file data in chrome storage
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await chrome.storage.local.set({ [fileId]: fileData });
      
      // Open dashboard with file mode and file ID
      const dashboardUrl = `${FRONTEND_URL}/dashboard?mode=file&type=${type}&fileId=${fileId}`;
      chrome.tabs.create({ url: dashboardUrl });
      
      showStatus(`Opening dashboard...`, 'success');
      setTimeout(() => window.close(), 1000);
    } catch (error) {
      console.error('Error processing document:', error);
      showStatus(error.message || 'Failed to process document. Please try again.', 'error');
      setTimeout(() => {
        document.getElementById('status').classList.add('hidden');
      }, 5000);
    }
    return;
  }
  
  // No supported content detected
  showStatus('Please navigate to a YouTube video or document (PDF, DOCX, etc.)', 'error');
  setTimeout(() => {
    document.getElementById('status').classList.add('hidden');
  }, 3000);
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
    let dashboardUrl = `${FRONTEND_URL}/dashboard`;
    
    if (tab.url) {
      dashboardUrl += `?url=${encodeURIComponent(tab.url)}`;
    }
    
    chrome.tabs.create({ url: dashboardUrl });
    window.close();
  });
  
  document.getElementById('openFullApp').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: FRONTEND_URL });
    window.close();
  });
});
