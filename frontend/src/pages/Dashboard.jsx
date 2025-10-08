import React, { useState, useRef, useEffect } from "react";
import api from "../utils/axios";
import BlogView from "../components/BlogView";
import SlidesView from "../components/SlidesView";
import FlashCardGallery from "../components/FlashCardGallery";
import QuizView from "../components/QuizView";
import SummaryView from "../components/SummaryView";
import Spinner from "../components/Spinner";
import PDFViewer from "../components/PDFViewer";
import "./Dashboard.css";
import { MessageCircle, BookOpen, ListChecks, FileText, StickyNote, Upload, Youtube } from "lucide-react";
import { useAuth } from "../context/FirebaseAuthContext";
import AuthModal from "../components/AuthModal";

function Dashboard() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [blog, setBlog] = useState("");
  const [pptxBase64, setPptxBase64] = useState("");
  const [slides, setSlides] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [quizContentId, setQuizContentId] = useState(null);
  const [activeTab, setActiveTab] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [videoId, setVideoId] = useState("");
  const [showVideo, setShowVideo] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isFileValidated, setIsFileValidated] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [isExtractingContent, setIsExtractingContent] = useState(false);
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
  const [showContentLayout, setShowContentLayout] = useState(false);
  const videoContainerRef = useRef(null);
  const { user, showAuthModal, toggleAuthModal } = useAuth();

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

  const handleFileSelect = async (file) => {
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
    setFileContent(""); // Clear previous content
    
    // Extract content for preview
    await extractFileContent(file);
  };

  const extractFileContent = async (file) => {
    try {
      setIsExtractingContent(true);
      setError("");
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/extract-file-content', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        setFileContent(response.data.content);
      } else {
        setError("Failed to extract content from file");
      }
    } catch (error) {
      console.error('Error extracting file content:', error);
      setError(error.response?.data?.error || "Failed to extract content from file");
    } finally {
      setIsExtractingContent(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if user is authenticated
    if (!user) {
      toggleAuthModal(true);
      return;
    }

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
          setQuizContentId(res.data.contentId || null);
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
              setQuizContentId(res.data.contentId || null);
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
    <div className="max-w-full mx-auto px-4 py-10 animate-fadeIn">
      <div className="text-center mb-10 animate-fadeInUp">
        <h1 className="text-4xl font-bold mb-4 text-[#171717cc] dark:text-[#fafafacc] text-glow">
          Learning Assistant
        </h1>
        <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full animate-pulse"></div>
      </div>

      {/* Upload Mode Toggle */}
      <div className="flex justify-center mb-8 animate-slideInLeft stagger-1">
        <div className="bg-gradient-to-r from-[#F3F4F6] to-[#E5E7EB] dark:from-[#1E1E1E] dark:to-[#2E2E2E] p-2 rounded-2xl shadow-xl flex gap-2 transition-all duration-300 hover:shadow-2xl hover-lift border border-neutral-200 dark:border-[#2E2E2E]">
          <button
            className={`px-8 py-4 rounded-xl transition-all duration-300 flex items-center gap-3 font-semibold hover-scale relative overflow-hidden ${
              uploadMode === "youtube"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105 animate-glow"
                : "text-[#4B5563] dark:text-[#9CA3AF] hover:bg-white/80 dark:hover:bg-[#2E2E2E]/80 hover:text-[#171717] dark:hover:text-[#fafafa]"
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
            className={`px-8 py-4 rounded-xl transition-all duration-300 flex items-center gap-3 font-semibold hover-scale relative overflow-hidden ${
              uploadMode === "file"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105 animate-glow"
                : "text-[#4B5563] dark:text-[#9CA3AF] hover:bg-white/80 dark:hover:bg-[#2E2E2E]/80 hover:text-[#171717] dark:hover:text-[#fafafa]"
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

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto mb-10 animate-slideInRight stagger-2">
        <div className="bg-gradient-to-br from-white/80 to-white/60 dark:from-[#171717]/80 dark:to-[#2E2E2E]/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 dark:border-[#2E2E2E]/50 transition-all duration-500 ease-in-out animate-fadeInUp">
          <div className="transition-all duration-300 ease-in-out transform">
            {uploadMode === "youtube" ? (
            <div key="youtube-form" className="flex flex-col sm:flex-row gap-4 items-stretch animate-fadeInUp transition-all duration-300 ease-in-out">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={url || ''}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste a YouTube video link here..."
                  className="w-full px-6 py-4 rounded-xl border-2 border-neutral-300 dark:border-[#2E2E2E] bg-white/90 dark:bg-[#171717]/90 backdrop-blur-sm text-[#171717cc] dark:text-[#fafafacc] placeholder-[#4B5563] dark:placeholder-[#9CA3AF] focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all input-focus hover-scale shadow-lg"
                  disabled={isLoading}
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
              <button
                type="submit"
                className={`px-8 py-4 rounded-xl font-bold text-white transition-all btn-animate hover-lift relative overflow-hidden shadow-lg ${
                  isLoading
                    ? "bg-neutral-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/50"
                }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : (
                  "Generate"
                )}
              </button>
            </div>
        ) : (
          <div
            key="file-upload-form"
            className={`relative border-2 ${
              dragActive ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" : "border-dashed border-neutral-300 dark:border-[#2E2E2E]"
            } rounded-2xl p-12 text-center transition-all upload-zone hover-lift bg-gradient-to-br from-white/30 to-white/10 dark:from-[#171717]/30 dark:to-[#2E2E2E]/10 backdrop-blur-sm animate-fadeInUp duration-300 ease-in-out ${
              isLoading ? "opacity-50 cursor-not-allowed" : "hover:border-blue-400 dark:hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
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
            <div className="space-y-6">
              <div className="flex justify-center animate-float">
                <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-200/50 dark:border-blue-800/50">
                  <Upload
                    size={48}
                    className="text-blue-500 dark:text-blue-400 hover-scale"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#171717cc] dark:text-[#fafafacc]">
                  Upload Your File
                </h3>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-500 hover:text-blue-600 font-bold text-lg transition-all hover-scale bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    disabled={isLoading}
                  >
                    Click to upload
                  </button>
                  <span className="text-[#4B5563] dark:text-[#9CA3AF] ml-2">
                    or drag and drop
                  </span>
                </div>
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
                className={`w-full mt-8 px-8 py-4 rounded-xl font-bold text-white transition-all btn-animate hover-lift relative overflow-hidden shadow-lg ${
                  isLoading || !selectedFile
                    ? "bg-neutral-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/50"
                }`}
                disabled={isLoading || !selectedFile}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : (
                  "Generate"
                )}
              </button>
            )}
          </div>
        )}
        {error && (
          <p className="text-red-500 mt-3 text-sm text-center bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800">{error}</p>
        )}
          </div>
        </div>
      </form>

      {/* Two-column layout start - only show after generate is clicked */}
      {showContentLayout && (
        <div className="flex flex-col md:flex-row gap-8 max-w-full mx-auto animate-fadeInUp stagger-3">
          {/* Left column: Video or File Preview */}
          <div className="md:w-1/2 w-full">
            {uploadMode === "youtube" && videoId && (
              <div 
                ref={videoContainerRef}
                className={`mb-6 overflow-hidden transition-all duration-700 ease-in-out video-container hover-lift ${
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
                  <button className="px-4 py-2 rounded-full bg-[#EEEEEE] dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] text-sm font-semibold shadow hover:bg-[#E5E7EB] dark:hover:bg-[#2E2E2E] transition-all hover-scale animate-fadeInUp stagger-4">Chapters</button>
                  <button className="px-4 py-2 rounded-full bg-[#EEEEEE] dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] text-sm font-semibold shadow hover:bg-[#E5E7EB] dark:hover:bg-[#2E2E2E] transition-all hover-scale animate-fadeInUp stagger-5">Transcripts</button>
                </div>
              </div>
            )}

            {uploadMode === "file" && selectedFile && (
              <div className="mb-6 overflow-hidden transition-all duration-700 ease-in-out opacity-100 max-h-96 transform translate-y-0">
                <div className="relative pt-0 pb-0 w-full overflow-hidden rounded-xl shadow-lg bg-white dark:bg-[#171717]">
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
                        <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] truncate">
                          {selectedFile.name}
                        </h3>
                        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    {/* File Preview Content */}
                    <div className="bg-gray-50 dark:bg-[#2E2E2E] rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                      {selectedFile.type === 'application/pdf' ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-[#171717cc] dark:text-[#fafafacc]">
                              PDF Preview
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Interactive PDF Viewer
                            </span>
                          </div>
                          <PDFViewer 
                            file={selectedFile} 
                            onError={(error) => setError(error)}
                          />
                        </div>
                      ) : isExtractingContent ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Extracting content from file...
                          </p>
                        </div>
                      ) : fileContent ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-[#171717cc] dark:text-[#fafafacc]">
                              File Content Preview
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {fileContent.length} characters
                            </span>
                          </div>
                          <div className="bg-white dark:bg-[#171717] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-[#fafafacc] leading-relaxed max-h-48 overflow-y-auto">
                              {fileContent.length > 2000 ? fileContent.substring(0, 2000) + '...' : fileContent}
                            </pre>
                          </div>
                          {fileContent.length > 2000 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                              Showing first 2000 characters. Full content will be processed for generation.
                            </p>
                          )}
                        </div>
                      ) : selectedFile.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ? (
                        <div className="text-center py-8">
                          <StickyNote size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">
                            PPTX Preview not available. Content will be processed for generation.
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileText size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">
                            Click "Generate" to process the file content.
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
              <div className="flex mb-6 bg-[#EEEEEE] dark:bg-[#171717] p-2 rounded-xl shadow-sm gap-2 items-center overflow-x-auto whitespace-nowrap max-w-full custom-scrollbar hover-glow">
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
                    "py-3 px-4 text-center font-semibold rounded-lg transition-all text-sm flex items-center justify-center gap-2 hover-scale";
                  const enabledClasses =
                    "bg-[#FFFFFF] dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] shadow-sm hover:bg-[#FAFAFA] dark:hover:bg-[#2E2E2E] hover:text-[#171717] dark:hover:text-[#fafafa]";
                  const activeClasses =
                    "bg-blue-500 text-white shadow-md dark:bg-blue-500 hover-lift animate-glow";
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
                      {isLoading && (
                        <div className="ml-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        </div>
                      )}
                      {hasError && " (!)"}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              {hasContent && (
                <div className="content-container custom-scrollbar bg-[#FFFFFF] dark:bg-[#171717] rounded-xl p-6 shadow-lg max-h-[70vh] overflow-y-auto card-hover animate-scaleIn">
                  {activeTab === "blog" && (
                    <>
                      {loadingStates.blog && <Spinner />}
                      {errors.blog && <p className="text-red-500">{errors.blog}</p>}
                      {!loadingStates.blog && !errors.blog && <BlogView blog={blog} />}
                    </>
                  )}
                  {activeTab === "slides" && (
                    <>
                      {loadingStates.slides && <Spinner />}
                      {errors.slides && <p className="text-red-500">{errors.slides}</p>}
                      {!loadingStates.slides && !errors.slides && (
                        <SlidesView pptxBase64={pptxBase64} slides={slides} />
                      )}
                    </>
                  )}
                  {activeTab === "flashcards" && (
                    <>
                      {loadingStates.flashcards && <Spinner />}
                      {errors.flashcards && <p className="text-red-500">{errors.flashcards}</p>}
                      {!loadingStates.flashcards && !errors.flashcards && (
                        <FlashCardGallery flashcards={flashcards} />
                      )}
                    </>
                  )}
                  {activeTab === "quiz" && (
                    <>
                      {loadingStates.quiz && <Spinner />}
                      {errors.quiz && <p className="text-red-500">{errors.quiz}</p>}
                      {!loadingStates.quiz && !errors.quiz && <QuizView quiz={quiz} quizId={quizContentId} />}
                    </>
                  )}
                  {activeTab === "summary" && (
                    <>
                      {loadingStates.summary && <Spinner />}
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
      {/* Two-column layout end */}
      
      {/* Auth Modal */}
      {showAuthModal && <AuthModal />}
    </div>
  );
}

export default Dashboard;