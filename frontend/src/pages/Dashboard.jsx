import React, { useState, useRef, useEffect } from "react";
import api from "../utils/axios";
import BlogView from "../components/BlogView";
import SlidesView from "../components/SlidesView";
import FlashCardGallery from "../components/FlashCardGallery";
import QuizView from "../components/QuizView";
import SummaryView from "../components/SummaryView";
import Spinner from "../components/Spinner";
import ChatBot from "../components/ChatBot";
import "./Dashboard.css";
import { MessageCircle, BookOpen, ListChecks, FileText, StickyNote, Upload, Youtube, Link, Mic } from "lucide-react";
import { useAuth } from "../context/FirebaseAuthContext";

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
  const [isChatBotOpen, setIsChatBotOpen] = useState(false);
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
  const [showContentLayout, setShowContentLayout] = useState(false);
  const videoContainerRef = useRef(null);
  const { user } = useAuth();

  // Function to create or update user record
  const createOrUpdateUser = async () => {
    if (!user) return;
    
    try {
      await api.post("/api/users", {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Unknown User',
        email: user.email || 'unknown@example.com'
      });
    } catch (error) {
      console.error("Error creating/updating user:", error);
    }
  };

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
      
      // Create or update user record
      await createOrUpdateUser();
      
      setTimeout(() => {
        setShowVideo(true);
        setShowContentLayout(true);
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
        // Create or update user record
        await createOrUpdateUser();
        
        // Validate the file and enable tabs
        setIsLoading(false);
        setIsFileValidated(true);  // Enable the tabs
        setShowContentLayout(true);  // Show the content layout
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
      // Create or update user record before generating content
      await createOrUpdateUser();
      
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
    setShowContentLayout(false);
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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Title */}
        <h1 className="text-5xl font-bold text-center mb-16 text-gray-800 dark:text-gray-100">
          What do you want to learn?
      </h1>

        {/* Input Method Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Upload Card */}
          <div 
            className={`relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 ${
              uploadMode === "file" ? "border-blue-500" : "border-gray-200 dark:border-gray-700"
            }`}
            onClick={() => {
              setUploadMode("file");
              resetStates();
            }}
          >
            <div className="absolute top-4 right-4">
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Popular
              </span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Upload size={32} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Upload</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">File, audio, video</p>
            </div>
          </div>

          {/* Paste Card */}
          <div 
            className={`bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 ${
              uploadMode === "youtube" ? "border-blue-500" : "border-gray-200 dark:border-gray-700"
            }`}
            onClick={() => {
              setUploadMode("youtube");
              resetStates();
            }}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Link size={32} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Paste</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">YouTube, website, text</p>
            </div>
          </div>

          {/* Record Card */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-gray-200 dark:border-gray-700"
            onClick={() => {
              alert("Recording feature coming soon!");
            }}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mic size={32} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Record</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Record class, video call</p>
            </div>
          </div>
      </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto mb-8">
        {uploadMode === "youtube" ? (
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-2">
            <input
              type="text"
              value={url || ''}
              onChange={(e) => setUrl(e.target.value)}
                placeholder="Learn anything"
                className="flex-1 px-6 py-4 text-lg bg-transparent border-none outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
              disabled={isLoading}
            />
            <button
              type="submit"
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600"
              }`}
              disabled={isLoading}
            >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </button>
          </div>
        ) : (
            <div className="space-y-4">
          <div
            className={`relative border-2 ${
                  dragActive ? "border-blue-500" : "border-dashed border-gray-300 dark:border-gray-600"
                } rounded-2xl p-8 text-center transition-all ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
                } bg-white dark:bg-gray-800`}
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
                      className="text-gray-600 dark:text-gray-400"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-700 font-semibold"
                  disabled={isLoading}
                >
                  Click to upload
                </button>
                    <span className="text-gray-600 dark:text-gray-400">
                  {" "}
                  or drag and drop
                </span>
              </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                PDF, DOCX, TXT, PPTX (max 10MB)
              </p>
              {selectedFile && (
                    <p className="text-sm text-blue-600">
                  Selected: {selectedFile.name}
                </p>
              )}
                </div>
            </div>
            {uploadMode === "file" && selectedFile && (
                <div className="flex items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-2">
                  <input
                    type="text"
                    value="Ready to process your file"
                    readOnly
                    className="flex-1 px-6 py-4 text-lg bg-transparent border-none outline-none text-gray-800 dark:text-gray-100"
                  />
              <button
                type="submit"
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isLoading || !selectedFile
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600"
                }`}
                disabled={isLoading || !selectedFile}
              >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
              </button>
                </div>
            )}
          </div>
        )}
        {error && (
          <p className="text-red-500 mt-3 text-sm text-center">{error}</p>
        )}
        </form>

        {/* Content Generation Section - Show after submission */}
        {showContentLayout && (
          <div className="flex flex-col md:flex-row gap-8 max-w-full mx-auto mt-12">
            {/* Left column: Video or File Preview */}
            <div className="md:w-1/2 w-full">
              {uploadMode === "youtube" && videoId && (
                <div 
                  ref={videoContainerRef}
                  className={`mb-6 overflow-hidden transition-all duration-700 ease-in-out ${
                    showVideo 
                      ? "opacity-100 max-h-96 transform translate-y-0" 
                      : "opacity-0 max-h-0 transform -translate-y-10"
                  }`}
                >
                  <div className="relative pt-0 pb-0 w-full overflow-hidden rounded-xl shadow-lg bg-white dark:bg-gray-800">
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
                    <button className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold shadow hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">Chapters</button>
                    <button className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold shadow hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">Transcripts</button>
                  </div>
                </div>
              )}

              {uploadMode === "file" && selectedFile && (
                <div className="mb-6 overflow-hidden transition-all duration-700 ease-in-out opacity-100 max-h-96 transform translate-y-0">
                  <div className="relative pt-0 pb-0 w-full overflow-hidden rounded-xl shadow-lg bg-white dark:bg-gray-800">
                    <div className="p-6">
                      {/* File Icon and Info */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          {selectedFile.type === 'application/pdf' && (
                            <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                          )}
                          {selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && (
                            <BookOpen size={24} className="text-blue-600 dark:text-blue-400" />
                          )}
                          {selectedFile.type === 'text/plain' && (
                            <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                          )}
                          {selectedFile.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' && (
                            <StickyNote size={24} className="text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {selectedFile.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      {/* File Preview Content */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
                        {selectedFile.type === 'application/pdf' && (
                          <div className="text-center py-8">
                            <FileText size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">
                              PDF Preview not available. Content will be processed for generation.
                            </p>
                          </div>
                        )}
                        {selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && (
                          <div className="text-center py-8">
                            <BookOpen size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">
                              DOCX Preview not available. Content will be processed for generation.
                            </p>
                          </div>
                        )}
                        {selectedFile.type === 'text/plain' && (
                          <div className="text-center py-8">
                            <FileText size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">
                              TXT Preview not available. Content will be processed for generation.
                            </p>
                          </div>
                        )}
                        {selectedFile.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' && (
                          <div className="text-center py-8">
                            <StickyNote size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">
                              PPTX Preview not available. Content will be processed for generation.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* File Status */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                            Ready for processing
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFile(null);
                            setIsFileValidated(false);
                            setShowContentLayout(false);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                          className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                        >
                          Remove file
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right column: Tabs and content */}
            <div className="md:w-1/2 w-full">
              <div className="max-w-4xl mx-auto">
                {/* Tab bar */}
                <div className="flex mb-6 bg-gray-100 dark:bg-gray-800 p-2 rounded-xl shadow-sm gap-2 items-center overflow-x-auto whitespace-nowrap max-w-full">
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
                      "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600";
                    const activeClasses =
                      "bg-blue-500 text-white shadow-md";
                    const disabledClasses =
                      "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 opacity-60 cursor-not-allowed";

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
                  <div className="content-container bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg max-h-[70vh] overflow-y-auto">
                    {activeTab === "blog" && (
                      <>
                        {loadingStates.blog && <p className="text-gray-800 dark:text-gray-200">Loading blog...</p>}
                        {errors.blog && <p className="text-red-500">{errors.blog}</p>}
                        {!loadingStates.blog && !errors.blog && <BlogView blog={blog} />}
                      </>
                    )}
                    {activeTab === "slides" && (
                      <>
                        {loadingStates.slides && <p className="text-gray-800 dark:text-gray-200">Loading slides...</p>}
                        {errors.slides && <p className="text-red-500">{errors.slides}</p>}
                        {!loadingStates.slides && !errors.slides && (
                          <SlidesView pptxBase64={pptxBase64} slides={slides} />
                        )}
                      </>
                    )}
                    {activeTab === "flashcards" && (
                      <>
                        {loadingStates.flashcards && <p className="text-gray-800 dark:text-gray-200">Loading flashcards...</p>}
                        {errors.flashcards && <p className="text-red-500">{errors.flashcards}</p>}
                        {!loadingStates.flashcards && !errors.flashcards && (
                          <FlashCardGallery flashcards={flashcards} />
                        )}
                      </>
                    )}
                    {activeTab === "quiz" && (
                      <>
                        {loadingStates.quiz && <p className="text-gray-800 dark:text-gray-200">Loading quiz...</p>}
                        {errors.quiz && <p className="text-red-500">{errors.quiz}</p>}
                        {!loadingStates.quiz && !errors.quiz && <QuizView quiz={quiz} />}
                      </>
                    )}
                    {activeTab === "summary" && (
                      <>
                        {loadingStates.summary && <p className="text-gray-800 dark:text-gray-200">Loading summary...</p>}
                        {errors.summary && <p className="text-red-500">{errors.summary}</p>}
                        {!loadingStates.summary && !errors.summary && <SummaryView summary={summary} />}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* ChatBot */}
      <ChatBot isOpen={isChatBotOpen} setIsOpen={setIsChatBotOpen} />
    </div>
  );
}

export default Dashboard;