import { useEffect, useRef, useState } from "react";

/**
 * A component that renders HTML slides content using iframes to ensure isolation
 * This component expands to fill the available screen space
 */
const SlidesView = ({ html }) => {
  const iframeRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Create a complete HTML document for the iframe
  const generateIframeContent = (htmlContent) => {
    // Validate and clean the HTML content
    let cleanedContent = htmlContent.trim();
    
    // Ensure content contains section tags
    if (!cleanedContent.includes('<section')) {
      // If no section tags, wrap the entire content in a section
      cleanedContent = `<section>${cleanedContent}</section>`;
    }
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Presentation Slides</title>
          
          <!-- Include Reveal.js from CDN -->
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/reveal.min.css">
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/theme/white.min.css">
          
          <style>
            body { 
              margin: 0;
              padding: 0;
              height: 100vh;
              overflow: hidden;
            }
            .reveal {
              height: 100vh;
              width: 100vw;
            }
            .reveal .slides {
              text-align: left;
            }
            .reveal h1, .reveal h2, .reveal h3 {
              text-transform: none;
              margin-bottom: 20px;
            }
            .reveal p {
              margin-bottom: 12px;
            }
            .reveal ul, .reveal ol {
              display: block;
              margin-left: 20px;
            }
            .reveal li {
              margin-bottom: 8px;
            }
            /* Ensure slides fill the available space */
            .reveal .slides section {
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <div class="reveal">
            <div class="slides">
              ${cleanedContent}
            </div>
          </div>
          
          <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/reveal.min.js"></script>
          <script>
            // Initialize immediately - no need to wait for DOMContentLoaded
            try {
              const deck = new Reveal({
                embedded: false, // Set to false for full-screen experience
                hash: false,
                history: false,
                controls: true,
                progress: true,
                center: false,
                transition: 'slide',
                slideNumber: true,
                width: "100%",
                height: "100%",
                margin: 0.05, // Reduced margin to maximize content space
                // Add plugins that might be helpful
                plugins: []
              });
              
              deck.initialize().then(() => {
                console.log('Reveal.js initialized successfully');
                // Send message to parent when ready
                window.parent.postMessage('slides-initialized', '*');
              }).catch(err => {
                console.error('Failed to initialize Reveal.js:', err);
                window.parent.postMessage('slides-error', '*');
              });
            } catch (e) {
              console.error('Error setting up Reveal.js:', e);
              window.parent.postMessage('slides-critical-error', '*');
            }
          </script>
        </body>
      </html>
    `;
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    const container = document.getElementById('slides-container');
    
    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    // Skip if there's no html content or iframe reference
    if (!html || !iframeRef.current) return;
    
    // Create a unique key for this instance to avoid potential conflicts
    const instanceId = `slides-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Write content to the iframe
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    try {
      // Clear any existing content
      iframeDoc.open();
      iframeDoc.write(generateIframeContent(html));
      iframeDoc.close();
    } catch (error) {
      console.error("Error injecting content into iframe:", error);
      return;
    }
    
    // Set up message listener for iframe communication
    const messageHandler = (event) => {
      // Handle different messages from the iframe
      switch(event.data) {
        case 'slides-initialized':
          console.log('Slides successfully initialized');
          // Hide loading indicator when slides are ready
          const loadingIndicator = document.getElementById('loading-indicator');
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
          break;
        case 'slides-error':
          console.warn('Error initializing slides in iframe');
          break;
        case 'slides-critical-error':
          console.error('Critical error in slides iframe');
          break;
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Add fullscreen change detection
    const fullscreenChangeHandler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', fullscreenChangeHandler);
    document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
    document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
    document.addEventListener('MSFullscreenChange', fullscreenChangeHandler);
    
    // Clean up
    return () => {
      window.removeEventListener('message', messageHandler);
      document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
      document.removeEventListener('webkitfullscreenchange', fullscreenChangeHandler);
      document.removeEventListener('mozfullscreenchange', fullscreenChangeHandler);
      document.removeEventListener('MSFullscreenChange', fullscreenChangeHandler);
      
      // Clear iframe content on unmount
      try {
        if (iframe && iframe.contentWindow) {
          iframeDoc.open();
          iframeDoc.write('');
          iframeDoc.close();
        }
      } catch (e) {
        console.warn('Failed to clear iframe:', e);
      }
    };
  }, [html]);

  return (
    <div className="slides-wrapper w-full flex flex-col">
      {/* Fullscreen button */}
      <div className="flex justify-end mb-2">
        <button 
          onClick={toggleFullscreen}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md flex items-center"
        >
          {isFullscreen ? (
            <>
              <span className="mr-1">Exit Fullscreen</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a2 2 0 012-2h2V3H7a4 4 0 00-4 4v2h2zm2 2H5v2a4 4 0 004 4h2v-2H7a2 2 0 01-2-2v-2zm8-2V7a2 2 0 00-2-2h-2V3h2a4 4 0 014 4v2h-2zm-2 2h2v2a4 4 0 01-4 4h-2v-2h2a2 2 0 002-2v-2z" clipRule="evenodd" />
              </svg>
            </>
          ) : (
            <>
              <span className="mr-1">Fullscreen</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </>
          )}
        </button>
      </div>
      
      {/* Main slides container - now takes up more vertical space */}
      <div 
        id="slides-container"
        className="slides-container w-full relative" 
        style={{ 
          height: isFullscreen ? '100vh' : 'calc(100vh - 100px)',
          maxHeight: isFullscreen ? '100vh' : '80vh'
        }}
      >
        {/* Loading indicator that shows until iframe is ready */}
        {html && (
          <div 
            id="loading-indicator"
            className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10"
          >
            <div className="text-gray-700 flex flex-col items-center">
              <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading presentation...
            </div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          title="Presentation Slides"
          className="w-full h-full border-0 bg-white"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
};

export default SlidesView;