// Content script for YouTube pages
// This adds an EduExtract button to YouTube videos

(function() {
  'use strict';
  
  // Wait for YouTube to load
  function waitForElement(selector, callback) {
    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        callback(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Create EduExtract button
  function createEduExtractButton() {
    const button = document.createElement('button');
    button.id = 'eduextract-btn';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" stroke="white" stroke-width="2"/>
        <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2"/>
        <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2"/>
      </svg>
      <span>EduExtract</span>
    `;
    button.title = 'Generate learning materials with EduExtract';
    
    button.addEventListener('click', () => {
      const url = window.location.href;
      chrome.runtime.sendMessage({
        action: 'openDashboard',
        url: url
      });
    });
    
    return button;
  }
  
  // Add button to YouTube player
  function addButtonToYouTube() {
    // For new YouTube layout
    const buttonContainer = document.querySelector('#top-level-buttons-computed');
    
    if (buttonContainer && !document.getElementById('eduextract-btn')) {
      const eduButton = createEduExtractButton();
      buttonContainer.insertBefore(eduButton, buttonContainer.firstChild);
      console.log('EduExtract button added to YouTube');
    }
  }
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      waitForElement('#top-level-buttons-computed', addButtonToYouTube);
    });
  } else {
    waitForElement('#top-level-buttons-computed', addButtonToYouTube);
  }
  
  // Re-add button when navigating (YouTube is SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(addButtonToYouTube, 1000);
    }
  }).observe(document.body, { subtree: true, childList: true });
  
})();
