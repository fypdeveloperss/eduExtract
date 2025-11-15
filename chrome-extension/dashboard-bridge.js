// Content script to bridge file data from Chrome extension to Dashboard
// This script runs on the dashboard page and retrieves files from chrome.storage

(function() {
  'use strict';
  
  // Listen for file requests from the dashboard page
  window.addEventListener('message', async (event) => {
    // Accept messages from same origin (dashboard page) or localhost
    const allowedOrigins = [
      window.location.origin,
      'http://localhost:5173',
      'https://localhost:5173',
      'http://127.0.0.1:5173'
    ];
    
    if (!allowedOrigins.includes(event.origin)) {
      return;
    }
    
    if (event.data && event.data.type === 'EDUEXTRACT_REQUEST_FILE') {
      const fileId = event.data.fileId;
      
      try {
        // Retrieve file from chrome.storage
        const result = await chrome.storage.local.get(fileId);
        const fileData = result[fileId];
        
        if (fileData) {
          // Send file data back to the page
          window.postMessage({
            type: 'EDUEXTRACT_FILE_DATA',
            fileId: fileId,
            fileData: fileData
          }, event.origin);
          
          // Clean up storage after sending
          chrome.storage.local.remove(fileId);
        } else {
          console.warn('File not found in storage:', fileId);
        }
      } catch (error) {
        console.error('Error retrieving file from storage:', error);
      }
    }
  });
  
  console.log('EduExtract dashboard bridge loaded');
})();

