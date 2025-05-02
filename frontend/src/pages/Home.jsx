import React, { useState } from "react";
import axios from "axios";
import BlogView from "../components/BlogView";
import SlidesView from "../components/SlidesView";
import FlashCardGallery from "../components/FlashCardGallery";
import QuizView from "../components/QuizView";
import "./Home.css";

function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [blog, setBlog] = useState("");
  const [pptxBase64, setPptxBase64] = useState("");
  const [slides, setSlides] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  const [error, setError] = useState("");

  const extractVideoId = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get("v");
    } catch (error) {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    setError("");
    setIsLoading(true);
    setBlog("");
    setPptxBase64("");
    setFlashcards([]);
    setQuiz([]);

    try {
      const [blogRes, slidesRes, flashRes, quizRes] = await Promise.all([
        axios.post("http://localhost:5000/generate", { url }),
        axios.post("http://localhost:5000/generate-slides", { url }),
        axios.post("http://localhost:5000/generate-flashcards", { url }),
        axios.post("http://localhost:5000/generate-quiz", { url }),
      ]);

      setBlog(blogRes.data.blogPost || "");
      setPptxBase64(slidesRes.data.pptxBase64 || "");
      setSlides(slidesRes.data.slides || []); // ✅ Add this line
      setFlashcards(flashRes.data.flashcards || []);
      setQuiz(quizRes.data.quiz || []);
    } catch (error) {
      console.error("Error generating content:", error);
      setError("Failed to generate content. Please try again.");
    } finally {
      setIsLoading(false); // Make sure to reset loading state after the process completes
    }
  };

  // Check if any content is available
  const hasContent =
    blog || pptxBase64 || flashcards.length > 0 || quiz.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        YouTube Learning Assistant
      </h1>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter YouTube URL"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`px-6 py-2 rounded-md text-white ${
              isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Generate"}
          </button>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </form>

      <div className="max-w-4xl mx-auto">
        {/* Modern tab design - always visible but disabled when no content */}
        <div className="tab-container">
          {[
            { id: "blog", label: "Blog" },
            { id: "slides", label: "Slides" },
            { id: "flashcards", label: "Flashcards" },
            { id: "quiz", label: "Quiz" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${
                activeTab === tab.id
                  ? "active"
                  : hasContent
                  ? "enabled"
                  : "disabled"
              }`}
              onClick={() => hasContent && setActiveTab(tab.id)}
              disabled={!hasContent}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {hasContent && (
          <div className="content-container">
            {activeTab === "blog" && <BlogView blog={blog} />}
            {activeTab === "slides" && (
              <SlidesView
                pptxBase64={pptxBase64}
                slides={slides} 
              />
            )}

            {activeTab === "flashcards" && (
              <FlashCardGallery flashcards={flashcards} />
            )}
            {activeTab === "quiz" && <QuizView quiz={quiz} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
