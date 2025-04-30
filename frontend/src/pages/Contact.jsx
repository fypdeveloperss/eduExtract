import { useState } from "react";
import SlidesView from "./SlidesView"; // Import the updated SlidesView component

const Contact = () => {
  const [url, setUrl] = useState("");
  const [slidesHtml, setSlidesHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const generateSlides = async () => {
    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setSlidesHtml(""); // Clear previous slides while loading
      
      const response = await fetch("http://localhost:5000/generate-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate that we got HTML content
      if (!data.slides || typeof data.slides !== 'string') {
        throw new Error("Invalid slides content received");
      }
      
      setSlidesHtml(data.slides);
      console.log("Slides HTML received successfully");
    } catch (err) {
      console.error("Failed to generate slides:", err);
      setError(`Failed to generate slides: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-6 max-w-7xl mx-auto w-full">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">YouTube to Slides</h2>
        
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-6 rounded-xl shadow-md mb-8">
          <p className="text-gray-700 mb-4">Transform any YouTube video into a beautiful presentation in seconds.</p>
          
          <div className="flex flex-col md:flex-row mb-4">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="p-3 rounded-lg border-2 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none transition-all w-full md:w-2/3 mb-2 md:mb-0 md:mr-2"
              placeholder="Enter YouTube video URL"
              disabled={isLoading}
            />
            <button
              onClick={generateSlides}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                isLoading 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-md hover:shadow-lg"
              } text-white`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : "Generate Slides"}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center my-12">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4"></div>
              <div className="text-lg text-gray-700">
                Generating slides from YouTube content...
              </div>
              <div className="text-sm text-gray-500 mt-2">
                This may take a moment depending on video length
              </div>
            </div>
          </div>
        )}
      </div>

      {slidesHtml && !isLoading && (
        <div className={`mt-4 flex-1 flex flex-col w-full`}>
          <div className="px-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold text-gray-800">Your Presentation</h3>
              <div className="text-sm text-gray-500">Use arrow keys or click the navigation controls to move between slides</div>
            </div>
          </div>
          
          {/* The slides view container - now takes the full width of the screen */}
          <div className="w-full flex-1 flex flex-col">
            <SlidesView html={slidesHtml} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact;