import { useState, useCallback } from "react";
import SlidesView from "../components/SlidesView";
import InputWithButton from "../components/InputWithButton";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";

const Contact = () => {
  const [url, setUrl] = useState("");
  const [slidesHtml, setSlidesHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const generateSlides = useCallback(async () => {
    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setSlidesHtml(""); 

      const response = await fetch("http://localhost:5000/generate-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.slides || typeof data.slides !== "string") {
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
  }, [url]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-6 max-w-7xl mx-auto w-full">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">YouTube to Slides</h2>

        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-6 rounded-xl shadow-md mb-8">
          <p className="text-gray-700 mb-4">
            Transform any YouTube video into a beautiful presentation in seconds.
          </p>

          <InputWithButton
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onClick={generateSlides}
            placeholder="Enter YouTube video URL"
            isLoading={isLoading}
            buttonText="Generate Slides"
          />
        </div>

        <ErrorMessage message={error} />
        {isLoading && <LoadingSpinner text="Generating slides from YouTube content..." />}
      </div>

      {slidesHtml && !isLoading && (
        <div className="mt-4 flex-1 flex flex-col w-full">
          <div className="px-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold text-gray-800">Your Presentation</h3>
              <div className="text-sm text-gray-500">
                Use arrow keys or click the navigation controls to move between slides
              </div>
            </div>
          </div>

          <div className="w-full flex-1 flex flex-col">
            <SlidesView html={slidesHtml} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact;
