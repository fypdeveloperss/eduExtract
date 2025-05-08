import React, { useState } from "react";
import axios from "axios";
import BlogView from "../components/BlogView";
import SlidesView from "../components/SlidesView";
import FlashCardGallery from "../components/FlashCardGallery";
import QuizView from "../components/QuizView";
import SummaryView from "../components/SummaryView";
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
  const [summary,setSummary] = useState(""); 

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
    setSummary("");

    try {
      const [blogRes, slidesRes, flashRes, quizRes, summaryRes] = await Promise.all([
        axios.post("http://localhost:5000/generate-blog", { url }),
        axios.post("http://localhost:5000/generate-slides", { url }),
        axios.post("http://localhost:5000/generate-flashcards", { url }),
        axios.post("http://localhost:5000/generate-quiz", { url }),
        axios.post("http://localhost:5000/generate-summary", { url }),
      ]);
  

      setBlog(blogRes.data.blogPost || "");
      setPptxBase64(slidesRes.data.pptxBase64 || "");
      setSlides(slidesRes.data.slides || []); // ✅ Add this line
      setFlashcards(flashRes.data.flashcards || []);
      setQuiz(quizRes.data.quiz || []);
      setSummary(summaryRes.data.summary || "");
    } catch (error) {
      console.error("Error generating content:", error);
      setError("Failed to generate content. Please try again.");
    } finally {
      setIsLoading(false); // Make sure to reset loading state after the process completes
    }
  };

  // Check if any content is available
  const hasContent =
    blog || pptxBase64 || flashcards.length > 0 || quiz.length > 0 || summary;

    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold text-center mb-10 text-neutral-900 dark:text-neutral-100">
          YouTube Learning Assistant
        </h1>
    
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto mb-10">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a YouTube video link here..."
              className="flex-1 px-5 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                isLoading
                  ? "bg-neutral-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Generate"}
            </button>
          </div>
          {error && (
            <p className="text-red-500 mt-3 text-sm text-center">{error}</p>
          )}
        </form>
    
        <div className="max-w-4xl mx-auto">
          {/* Tab bar */}
          <div className="flex mb-6 bg-neutral-100 dark:bg-[#1f1f1f] p-2 rounded-xl shadow-sm gap-2">
            {[
              { id: "blog", label: "Blog" },
              { id: "slides", label: "Slides" },
              { id: "flashcards", label: "Flashcards" },
              { id: "quiz", label: "Quiz" },
              { id: "summary", label: "Summary" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const isDisabled = !hasContent;
    
              const baseClasses =
                "flex-1 py-3 px-4 text-center font-semibold rounded-lg transition-all text-sm";
              const enabledClasses =
                "bg-white dark:bg-[#1a1a1a] text-neutral-800 dark:text-neutral-200 shadow-sm hover:bg-blue-50 dark:hover:bg-[#2a2a2a] hover:text-blue-600 dark:hover:text-blue-400";
              const activeClasses =
                "bg-blue-600 text-white shadow-md dark:bg-blue-500";
              const disabledClasses =
                "bg-neutral-200 dark:bg-[#2a2a2a] text-neutral-400 cursor-not-allowed";
    
              let classes = baseClasses;
              if (isDisabled) {
                classes += ` ${disabledClasses}`;
              } else if (isActive) {
                classes += ` ${activeClasses}`;
              } else {
                classes += ` ${enabledClasses}`;
              }
    
              return (
                <button
                  key={tab.id}
                  className={classes}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
    
          {/* Tab content */}
          {hasContent && (
            <div className="bg-white dark:bg-[#1f1f1f] rounded-xl p-6 shadow-lg">
              {activeTab === "blog" && <BlogView blog={blog} />}
              {activeTab === "slides" && (
                <SlidesView pptxBase64={pptxBase64} slides={slides} />
              )}
              {activeTab === "flashcards" && (
                <FlashCardGallery flashcards={flashcards} />
              )}
              {activeTab === "quiz" && <QuizView quiz={quiz} />}
              {activeTab === "summary" && <SummaryView summary={summary} />}
            </div>
          )}
        </div>
      </div>
    );
    
}

export default Home;
