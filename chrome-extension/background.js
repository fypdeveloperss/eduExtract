// Background service worker for Chrome extension

const FRONTEND_URL = 'http://localhost:5173'; // Change to your deployed URL

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openDashboard') {
    chrome.tabs.create({
      url: `${FRONTEND_URL}/dashboard?url=${encodeURIComponent(request.url)}`
    });
  }
  
  if (request.action === 'generateContent') {
    chrome.tabs.create({
      url: `${FRONTEND_URL}/dashboard?url=${encodeURIComponent(request.url)}&type=${request.type}`
    });
  }
});

// Context menu for right-click
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items
  chrome.contextMenus.create({
    id: 'eduextract-generate',
    title: 'Generate with EduExtract',
    contexts: ['page', 'link']
  });
  
  chrome.contextMenus.create({
    id: 'eduextract-summary',
    parentId: 'eduextract-generate',
    title: 'Summary',
    contexts: ['page', 'link']
  });
  
  chrome.contextMenus.create({
    id: 'eduextract-blog',
    parentId: 'eduextract-generate',
    title: 'Blog Post',
    contexts: ['page', 'link']
  });
  
  chrome.contextMenus.create({
    id: 'eduextract-quiz',
    parentId: 'eduextract-generate',
    title: 'Quiz',
    contexts: ['page', 'link']
  });
  
  chrome.contextMenus.create({
    id: 'eduextract-flashcards',
    parentId: 'eduextract-generate',
    title: 'Flashcards',
    contexts: ['page', 'link']
  });
  
  chrome.contextMenus.create({
    id: 'eduextract-slides',
    parentId: 'eduextract-generate',
    title: 'Slides',
    contexts: ['page', 'link']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = info.linkUrl || info.pageUrl || tab.url;
  
  const typeMap = {
    'eduextract-summary': 'summary',
    'eduextract-blog': 'blog',
    'eduextract-quiz': 'quiz',
    'eduextract-flashcards': 'flashcards',
    'eduextract-slides': 'slides'
  };
  
  const type = typeMap[info.menuItemId];
  
  if (type) {
    chrome.tabs.create({
      url: `${FRONTEND_URL}/dashboard?url=${encodeURIComponent(url)}&type=${type}`
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This opens the popup (defined in manifest)
  // No code needed here if using popup.html
});

console.log('EduExtract extension background service worker loaded');
