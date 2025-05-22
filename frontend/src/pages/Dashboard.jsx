import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import BlogView from "../components/BlogView";
import SlidesView from "../components/SlidesView";
import FlashCardGallery from "../components/FlashCardGallery";
import QuizView from "../components/QuizView";
import SummaryView from "../components/SummaryView";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

function Dashboard() {
  const { isAuthenticated, toggleAuthModal } = useAuth();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [blog, setBlog] = useState("");
  const [pptxBase64, setPptxBase64] = useState("");
  const [slides, setSlides] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [videoId, setVideoId] = useState("");
  const [showVideo, setShowVideo] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    blog: false,
    slides: false,
    flashcards: false,
    quiz: false,
    summary: false
  });
  const [errors, setErrors] = useState({
    blog: "",
    slides: "",
    flashcards: "",
    quiz: "",
    summary: ""
  });
  const [loaded, setLoaded] = useState({
    blog: false,
    slides: false,
    flashcards: false,
    quiz: false,
    summary: false
  });
  const videoContainerRef = useRef(null);

  const extractVideoId = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get("v");
    } catch (error) {
      return null;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toggleAuthModal();
      return;
    }

    const extractedVideoId = extractVideoId(url);
    if (!extractedVideoId) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    setError("");
    setIsLoading(true);
    setBlog("");
    setPptxBase64("");
    setSlides([]);
    setFlashcards([]);
    setQuiz([]);
    setSummary("");
    setVideoId(extractedVideoId);
    setShowVideo(false);
    setActiveTab("");
    setLoadingStates({
      blog: false,
      slides: false,
      flashcards: false,
      quiz: false,
      summary: false
    });
    setErrors({
      blog: "",
      slides: "",
      flashcards: "",
      quiz: "",
      summary: ""
    });
    setLoaded({
      blog: false,
      slides: false,
      flashcards: false,
      quiz: false,
      summary: false
    });
    setTimeout(() => {
      setShowVideo(true);
      setIsLoading(false);
    }, 100);
  };

  // Function to handle tab click and lazy load data
  const handleTabClick = async (tabId) => {
    setActiveTab(tabId);
    if (loaded[tabId] || !videoId) return;
    setLoadingStates(prev => ({ ...prev, [tabId]: true }));
    setErrors(prev => ({ ...prev, [tabId]: "" }));
    try {
      let res;
      if (tabId === "blog") {
        res = await axios.post("http://localhost:5000/generate-blog", { url });
        setBlog(res.data.blogPost || "");
      } else if (tabId === "slides") {
        res = await axios.post("http://localhost:5000/generate-slides", { url });
        setPptxBase64(res.data.pptxBase64 || "");
        setSlides(res.data.slides || []);
      } else if (tabId === "flashcards") {
        res = await axios.post("http://localhost:5000/generate-flashcards", { url });
        setFlashcards(res.data.flashcards || []);
      } else if (tabId === "quiz") {
        res = await axios.post("http://localhost:5000/generate-quiz", { url });
        setQuiz(res.data.quiz || []);
      } else if (tabId === "summary") {
        res = await axios.post("http://localhost:5000/generate-summary", { url });
        setSummary(res.data.summary || "");
      }
      setLoaded(prev => ({ ...prev, [tabId]: true }));
    } catch (err) {
      setErrors(prev => ({ ...prev, [tabId]: err.response?.data?.error || `Failed to generate ${tabId}` }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [tabId]: false }));
    }
  };

  // Scroll the video into view when it appears
  useEffect(() => {
    if (showVideo && videoContainerRef.current) {
      videoContainerRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [showVideo]);

  // Check if any content is available
  const hasContent =
    blog || pptxBase64 || flashcards.length > 0 || quiz.length > 0 || summary;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-bold text-center mb-10 text-[#171717cc] dark:text-[#fafafacc]">
        YouTube Learning Assistant
      </h1>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto mb-10">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube video link here..."
            className="flex-1 px-5 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-[#FFFFFF] dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${
              isLoading
                ? "bg-neutral-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
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

      {/* Two-column layout start */}
      <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">
        {/* Left column: Video */}
        <div className="md:w-1/2 w-full">
          {videoId && (
            <div 
              ref={videoContainerRef}
              className={`mb-10 overflow-hidden transition-all duration-700 ease-in-out ${
                showVideo 
                  ? "opacity-100 max-h-96 transform translate-y-0" 
                  : "opacity-0 max-h-0 transform -translate-y-10"
              }`}
            >
              <div className="relative pt-0 pb-0 w-full overflow-hidden rounded-xl shadow-lg">
                <div className="relative" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full rounded-xl"
                    src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Tabs and content */}
        <div className="md:w-1/2 w-full">
          <div className="max-w-4xl mx-auto">
            {/* Tab bar */}
            <div className="flex mb-6 bg-[#EEEEEE] dark:bg-[#2E2E2E] p-2 rounded-xl shadow-sm gap-2">
              {[
                { id: "blog", label: "Blog" },
                { id: "slides", label: "Slides" },
                { id: "flashcards", label: "Flashcards" },
                { id: "quiz", label: "Quiz" },
                { id: "summary", label: "Summary" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const isDisabled = !videoId;
                const isLoading = loadingStates[tab.id];
                const hasError = errors[tab.id];

                const baseClasses =
                  "flex-1 py-3 px-4 text-center font-semibold rounded-lg transition-all text-sm";
                const enabledClasses =
                  "bg-[#FFFFFF] dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] shadow-sm hover:bg-[#FAFAFA] dark:hover:bg-[#121212] hover:text-[#171717] dark:hover:text-[#fafafa]";
                const activeClasses =
                  "bg-blue-500 text-white shadow-md dark:bg-blue-500";
                const disabledClasses =
                  "bg-[#EEEEEE] dark:bg-[#2E2E2E] text-[#171717cc] opacity-50 cursor-not-allowed";

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
                    onClick={() => !isDisabled && handleTabClick(tab.id)}
                    disabled={isDisabled}
                  >
                    {tab.label}
                    {isLoading && " (Loading...)"}
                    {hasError && " (!)"}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            {hasContent && (
              <div className="bg-[#FFFFFF] dark:bg-[#171717] rounded-xl p-6 shadow-lg">
                {activeTab === "blog" && (
                  <>
                    {loadingStates.blog && <p>Loading blog...</p>}
                    {errors.blog && <p className="text-red-500">{errors.blog}</p>}
                    {!loadingStates.blog && !errors.blog && <BlogView blog={blog} />}
                  </>
                )}
                {activeTab === "slides" && (
                  <>
                    {loadingStates.slides && <p>Loading slides...</p>}
                    {errors.slides && <p className="text-red-500">{errors.slides}</p>}
                    {!loadingStates.slides && !errors.slides && (
                      <SlidesView pptxBase64={pptxBase64} slides={slides} />
                    )}
                  </>
                )}
                {activeTab === "flashcards" && (
                  <>
                    {loadingStates.flashcards && <p>Loading flashcards...</p>}
                    {errors.flashcards && <p className="text-red-500">{errors.flashcards}</p>}
                    {!loadingStates.flashcards && !errors.flashcards && (
                      <FlashCardGallery flashcards={flashcards} />
                    )}
                  </>
                )}
                {activeTab === "quiz" && (
                  <>
                    {loadingStates.quiz && <p>Loading quiz...</p>}
                    {errors.quiz && <p className="text-red-500">{errors.quiz}</p>}
                    {!loadingStates.quiz && !errors.quiz && <QuizView quiz={quiz} />}
                  </>
                )}
                {activeTab === "summary" && (
                  <>
                    {loadingStates.summary && <p>Loading summary...</p>}
                    {errors.summary && <p className="text-red-500">{errors.summary}</p>}
                    {!loadingStates.summary && !errors.summary && <SummaryView summary={summary} />}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Two-column layout end */}
    </div>
  );
}

export default Dashboard;