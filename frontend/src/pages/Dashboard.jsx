import React, { useState, useRef, useEffect } from "react";
import api from "../utils/axios";
import BlogView from "../components/BlogView";
import SlidesView from "../components/SlidesView";
import FlashCardGallery from "../components/FlashCardGallery";
import QuizView from "../components/QuizView";
import SummaryView from "../components/SummaryView";
import "./Dashboard.css";
import { MessageCircle, BookOpen, ListChecks, FileText, StickyNote, Upload, Youtube } from "lucide-react";

function Dashboard() {
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [isFileValidated, setIsFileValidated] = useState(false);
  const [uploadMode, setUploadMode] = useState("youtube");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
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

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) {
      setError("No file selected");
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Only PDF, DOCX, TXT, and PPTX files are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError("File size exceeds 10MB limit.");
      return;
    }

    setSelectedFile(file);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (uploadMode === "youtube") {
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
    } else {
      if (!selectedFile) {
        setError("Please select a file to upload");
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
      setVideoId("");
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

      try {
        // Validate the file and enable tabs
        setIsLoading(false);
        setIsFileValidated(true);  // Enable the tabs
      } catch (err) {
        setError(err.response?.data?.error || "Failed to process file");
        setIsLoading(false);
        setSelectedFile(null);
        setIsFileValidated(false);  // Disable the tabs on error
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  // Function to handle tab click and lazy load data
  const handleTabClick = async (tabId) => {
    if (!videoId && !selectedFile) return;
    
    setActiveTab(tabId);
    if (loaded[tabId]) return;
    
    setLoadingStates(prev => ({ ...prev, [tabId]: true }));
    setErrors(prev => ({ ...prev, [tabId]: "" }));
    
    try {
      let res;
      if (videoId) {
        if (tabId === "blog") {
          res = await api.post("/generate-blog", { url });
          setBlog(res.data.blogPost || "");
        } else if (tabId === "slides") {
          res = await api.post("/generate-slides", { url });
          setPptxBase64(res.data.pptxBase64 || "");
          setSlides(res.data.slides || []);
        } else if (tabId === "flashcards") {
          res = await api.post("/generate-flashcards", { url });
          setFlashcards(res.data.flashcards || []);
        } else if (tabId === "quiz") {
          res = await api.post("/generate-quiz", { url });
          setQuiz(res.data.quiz || []);
        } else if (tabId === "summary") {
          res = await api.post("/generate-summary", { url });
          setSummary(res.data.summary || "");
        }
      } else if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('type', tabId);
        
        try {
          console.log('Sending request for tab:', tabId);
          res = await api.post("/process-file", formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          console.log('Response for tab:', tabId, res.data);

          switch (tabId) {
            case 'blog':
              if (!res.data.blog) {
                throw new Error('No blog content received from server');
              }
              setBlog(res.data.blog);
              break;
            case 'slides':
              setPptxBase64(res.data.pptxBase64 || "");
              setSlides(res.data.slides || []);
              break;
            case 'flashcards':
              setFlashcards(res.data.flashcards || []);
              break;
            case 'quiz':
              setQuiz(res.data.quiz || []);
              break;
            case 'summary':
              setSummary(res.data.summary || "");
              break;
          }
        } catch (error) {
          console.error("Error processing file:", error);
          setErrors(prev => ({
            ...prev,
            [tabId]: error.response?.data?.error || error.message || `Failed to process ${tabId}`
          }));
          return;
        }
      }
      setLoaded(prev => ({ ...prev, [tabId]: true }));
    } catch (err) {
      console.error(`Error in ${tabId} generation:`, err);
      setErrors(prev => ({ 
        ...prev, 
        [tabId]: err.response?.data?.error || err.message || `Failed to generate ${tabId}` 
      }));
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

  // Update the hasContent check to properly handle both video and file modes
  const hasContent = videoId || isFileValidated;

  // Reset isFileValidated when switching modes
  const resetStates = () => {
    setUrl("");
    setBlog("");
    setPptxBase64("");
    setSlides([]);
    setFlashcards([]);
    setQuiz([]);
    setSummary("");
    setVideoId("");
    setShowVideo(false);
    setActiveTab("");
    setSelectedFile(null);
    setIsFileValidated(false);
    setError("");
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-full mx-auto px-4 py-10">
      <h1 className="text-4xl font-bold text-center mb-10 text-[#171717cc] dark:text-[#fafafacc]">
        Learning Assistant
      </h1>

      {/* Upload Mode Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-[#F3F4F6] dark:bg-[#1E1E1E] p-2 rounded-2xl shadow-lg flex gap-2 transition-all duration-300 hover:shadow-xl">
          <button
            className={`px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 font-medium ${
              uploadMode === "youtube"
                ? "bg-white dark:bg-[#2E2E2E] text-blue-600 dark:text-blue-400 shadow-md transform scale-105"
                : "text-[#4B5563] dark:text-[#9CA3AF] hover:bg-white/50 dark:hover:bg-[#2E2E2E]/50"
            }`}
            onClick={() => {
              setUploadMode("youtube");
              resetStates();
            }}
          >
            <Youtube size={22} className={uploadMode === "youtube" ? "text-blue-600 dark:text-blue-400" : ""} />
            <span>YouTube URL</span>
          </button>
          <button
            className={`px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 font-medium ${
              uploadMode === "file"
                ? "bg-white dark:bg-[#2E2E2E] text-blue-600 dark:text-blue-400 shadow-md transform scale-105"
                : "text-[#4B5563] dark:text-[#9CA3AF] hover:bg-white/50 dark:hover:bg-[#2E2E2E]/50"
            }`}
            onClick={() => {
              setUploadMode("file");
              resetStates();
            }}
          >
            <Upload size={22} className={uploadMode === "file" ? "text-blue-600 dark:text-blue-400" : ""} />
            <span>File Upload</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto mb-10">
        {uploadMode === "youtube" ? (
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <input
              type="text"
              value={url || ''}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a YouTube video link here..."
              className="flex-1 px-5 py-3 rounded-lg border border-neutral-300 dark:border-[#2E2E2E] bg-[#FFFFFF] dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
        ) : (
          <div
            className={`relative border-2 ${
              dragActive ? "border-blue-500" : "border-dashed border-neutral-300 dark:border-[#2E2E2E]"
            } rounded-lg p-8 text-center transition-all ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileSelect(file);
                }
              }}
              accept=".pdf,.docx,.txt,.pptx"
              disabled={isLoading}
            />
            <div className="space-y-4">
              <div className="flex justify-center">
                <Upload
                  size={40}
                  className="text-[#171717cc] dark:text-[#fafafacc]"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-500 hover:text-blue-600 font-semibold"
                  disabled={isLoading}
                >
                  Click to upload
                </button>
                <span className="text-[#171717cc] dark:text-[#fafafacc]">
                  {" "}
                  or drag and drop
                </span>
              </div>
              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                PDF, DOCX, TXT, PPTX (max 10MB)
              </p>
              {selectedFile && (
                <p className="text-sm text-blue-500">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
            {uploadMode === "file" && selectedFile && (
              <button
                type="submit"
                className={`w-full mt-6 px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                  isLoading || !selectedFile
                    ? "bg-neutral-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
                disabled={isLoading || !selectedFile}
              >
                {isLoading ? "Processing..." : "Generate"}
              </button>
            )}
          </div>
        )}
        {error && (
          <p className="text-red-500 mt-3 text-sm text-center">{error}</p>
        )}
      </form>

      {/* Two-column layout start */}
      <div className="flex flex-col md:flex-row gap-8 max-w-full mx-auto">
        {/* Left column: Video */}
        <div className="md:w-1/2 w-full">
          {videoId && (
            <div 
              ref={videoContainerRef}
              className={`mb-6 overflow-hidden transition-all duration-700 ease-in-out ${
                showVideo 
                  ? "opacity-100 max-h-96 transform translate-y-0" 
                  : "opacity-0 max-h-0 transform -translate-y-10"
              }`}
            >
              <div className="relative pt-0 pb-0 w-full overflow-hidden rounded-xl shadow-lg bg-white dark:bg-[#171717]">
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
              {/* Pills for Chapters and Transcripts */}
              <div className="flex gap-2 mt-4">
                <button className="px-4 py-2 rounded-full bg-[#EEEEEE] dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] text-sm font-semibold shadow hover:bg-[#E5E7EB] dark:hover:bg-[#2E2E2E] transition-all">Chapters</button>
                <button className="px-4 py-2 rounded-full bg-[#EEEEEE] dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] text-sm font-semibold shadow hover:bg-[#E5E7EB] dark:hover:bg-[#2E2E2E] transition-all">Transcripts</button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Tabs and content */}
        <div className="md:w-1/2 w-full">
          <div className="max-w-4xl mx-auto">
            {/* Tab bar */}
            <div className="flex mb-6 bg-[#EEEEEE] dark:bg-[#171717] p-2 rounded-xl shadow-sm gap-2 items-center overflow-x-auto whitespace-nowrap max-w-full custom-scrollbar">
              {[
                { id: "summary", label: "Summary", icon: <FileText size={20} className="inline mr-2" /> },
                { id: "blog", label: "Blog", icon: <BookOpen size={20} className="inline mr-2" /> },
                { id: "slides", label: "Slides", icon: <StickyNote size={20} className="inline mr-2" /> },
                { id: "flashcards", label: "Flashcards", icon: <MessageCircle size={20} className="inline mr-2" /> },
                { id: "quiz", label: "Quiz", icon: <ListChecks size={20} className="inline mr-2" /> },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const isDisabled = !hasContent;
                const isLoading = loadingStates[tab.id];
                const hasError = errors[tab.id];

                const baseClasses =
                  "py-3 px-4 text-center font-semibold rounded-lg transition-all text-sm flex items-center justify-center gap-2";
                const enabledClasses =
                  "bg-[#FFFFFF] dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] shadow-sm hover:bg-[#FAFAFA] dark:hover:bg-[#2E2E2E] hover:text-[#171717] dark:hover:text-[#fafafa]";
                const activeClasses =
                  "bg-blue-500 text-white shadow-md dark:bg-blue-500";
                const disabledClasses =
                  "bg-[#EEEEEE] dark:bg-[#171717] text-[#6B7280] dark:text-[#fafafacc] opacity-60 cursor-not-allowed";

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
                    {tab.icon}
                    {tab.label}
                    {isLoading && " (Loading...)"}
                    {hasError && " (!)"}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            {hasContent && (
              <div className="content-container custom-scrollbar bg-[#FFFFFF] dark:bg-[#171717] rounded-xl p-6 shadow-lg max-h-[70vh] overflow-y-auto">
                {activeTab === "blog" && (
                  <>
                    {loadingStates.blog && <p className="text-[#171717cc] dark:text-[#fafafacc]">Loading blog...</p>}
                    {errors.blog && <p className="text-red-500">{errors.blog}</p>}
                    {!loadingStates.blog && !errors.blog && <BlogView blog={blog} />}
                  </>
                )}
                {activeTab === "slides" && (
                  <>
                    {loadingStates.slides && <p className="text-[#171717cc] dark:text-[#fafafacc]">Loading slides...</p>}
                    {errors.slides && <p className="text-red-500">{errors.slides}</p>}
                    {!loadingStates.slides && !errors.slides && (
                      <SlidesView pptxBase64={pptxBase64} slides={slides} />
                    )}
                  </>
                )}
                {activeTab === "flashcards" && (
                  <>
                    {loadingStates.flashcards && <p className="text-[#171717cc] dark:text-[#fafafacc]">Loading flashcards...</p>}
                    {errors.flashcards && <p className="text-red-500">{errors.flashcards}</p>}
                    {!loadingStates.flashcards && !errors.flashcards && (
                      <FlashCardGallery flashcards={flashcards} />
                    )}
                  </>
                )}
                {activeTab === "quiz" && (
                  <>
                    {loadingStates.quiz && <p className="text-[#171717cc] dark:text-[#fafafacc]">Loading quiz...</p>}
                    {errors.quiz && <p className="text-red-500">{errors.quiz}</p>}
                    {!loadingStates.quiz && !errors.quiz && <QuizView quiz={quiz} />}
                  </>
                )}
                {activeTab === "summary" && (
                  <>
                    {loadingStates.summary && <p className="text-[#171717cc] dark:text-[#fafafacc]">Loading summary...</p>}
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