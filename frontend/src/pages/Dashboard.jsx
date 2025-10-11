import React, { useState, useRef, useEffect } from "react";
import api from "../utils/axios";
import BlogView from "../components/BlogView";
import SlidesView from "../components/SlidesView";
import FlashCardGallery from "../components/FlashCardGallery";
import QuizView from "../components/QuizView";
import SummaryView from "../components/SummaryView";
import Spinner from "../components/Spinner";
import PDFViewer from "../components/PDFViewer";
import ChatBot from "../components/ChatBot";
import PasteModal from "../components/PasteModal";
import useContentContext from "../hooks/useContentContext";
import "./Dashboard.css";
import { MessageCircle, BookOpen, ListChecks, FileText, StickyNote, Upload, Youtube, Link, Target } from "lucide-react";
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
  const { user } = useAuth();
  
  // Modal and chatbot states
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  // Content context for chatbot
  const {
    currentSessionContent,
    originalSource,
    updateCurrentSessionContent,
    setOriginalSourceContent,
    clearCurrentSession,
    getContextForChat
  } = useContentContext();

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

  // Handle modal submission
  const handleModalSubmit = ({ type, content }) => {
    if (type === 'url') {
      setUrl(content);
      // Clear previous session context and set new original source
      clearCurrentSession();
      setOriginalSourceContent({
        type: 'youtube',
        url: content,
        videoId: extractVideoId(content),
        content: null // Will be fetched when content is generated
      });
      
      // Process the URL immediately
      handleUrlSubmit(content);
    } else if (type === 'text') {
      // Handle text content
      clearCurrentSession();
      setOriginalSourceContent({
        type: 'text',
        content: content,
        fileName: 'Pasted Text'
      });
      
      // Process the text content immediately
      handleTextSubmit(content);
    }
  };

  // Handle URL submission
  const handleUrlSubmit = async (urlToProcess) => {
    const extractedVideoId = extractVideoId(urlToProcess);
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
  };

  // Handle text content submission
  const handleTextSubmit = async (textContent) => {
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
      
      // Validate the text content and enable tabs
      setIsLoading(false);
      setIsFileValidated(true);  // Enable the tabs
      setShowContentLayout(true);  // Show the content layout
    } catch (err) {
      setError(err.response?.data?.error || "Failed to process text content");
      setIsLoading(false);
      setIsFileValidated(false);  // Disable the tabs on error
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
      
      // Clear previous session context and set new original source
      clearCurrentSession();
      setOriginalSourceContent({
        type: 'youtube',
        url: url,
        videoId: extractedVideoId,
        content: null // Will be fetched when content is generated
      });
      
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
      
      // Clear previous session context and set new original source
      clearCurrentSession();
      setOriginalSourceContent({
        type: 'file',
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        content: fileContent
      });
      
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
    if (!videoId && !selectedFile && !originalSource?.content) return;
    
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
          // Update context with generated blog
          updateCurrentSessionContent('blog', res.data.blogPost, {
            contentId: res.data.contentId,
            source: 'youtube',
            url: url
          });
        } else if (tabId === "slides") {
          res = await api.post("/generate-slides", { url });
          setPptxBase64(res.data.pptxBase64 || "");
          setSlides(res.data.slides || []);
          // Update context with generated slides
          updateCurrentSessionContent('slides', res.data.slides, {
            contentId: res.data.contentId,
            source: 'youtube',
            url: url,
            pptxBase64: res.data.pptxBase64
          });
        } else if (tabId === "flashcards") {
          res = await api.post("/generate-flashcards", { url });
          setFlashcards(res.data.flashcards || []);
          // Update context with generated flashcards
          updateCurrentSessionContent('flashcards', res.data.flashcards, {
            contentId: res.data.contentId,
            source: 'youtube',
            url: url
          });
        } else if (tabId === "quiz") {
          res = await api.post("/generate-quiz", { url });
          setQuiz(res.data.quiz || []);
          // Update context with generated quiz
          updateCurrentSessionContent('quiz', res.data.quiz, {
            contentId: res.data.contentId,
            source: 'youtube',
            url: url
          });
        } else if (tabId === "summary") {
          res = await api.post("/generate-summary", { url });
          setSummary(res.data.summary || "");
          // Update context with generated summary
          updateCurrentSessionContent('summary', res.data.summary, {
            contentId: res.data.contentId,
            source: 'youtube',
            url: url
          });
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
              // Update context with generated blog
              updateCurrentSessionContent('blog', res.data.blog, {
                contentId: res.data.contentId,
                source: 'file',
                fileName: selectedFile.name
              });
              break;
            case 'slides':
              setPptxBase64(res.data.pptxBase64 || "");
              setSlides(res.data.slides || []);
              // Update context with generated slides
              updateCurrentSessionContent('slides', res.data.slides, {
                contentId: res.data.contentId,
                source: 'file',
                fileName: selectedFile.name,
                pptxBase64: res.data.pptxBase64
              });
              break;
            case 'flashcards':
              setFlashcards(res.data.flashcards || []);
              // Update context with generated flashcards
              updateCurrentSessionContent('flashcards', res.data.flashcards, {
                contentId: res.data.contentId,
                source: 'file',
                fileName: selectedFile.name
              });
              break;
            case 'quiz':
              setQuiz(res.data.quiz || []);
              // Update context with generated quiz
              updateCurrentSessionContent('quiz', res.data.quiz, {
                contentId: res.data.contentId,
                source: 'file',
                fileName: selectedFile.name
              });
              break;
            case 'summary':
              setSummary(res.data.summary || "");
              // Update context with generated summary
              updateCurrentSessionContent('summary', res.data.summary, {
                contentId: res.data.contentId,
                source: 'file',
                fileName: selectedFile.name
              });
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
      } else if (originalSource?.type === 'text' && originalSource?.content) {
        // Handle text content
        if (tabId === "blog") {
          res = await api.post("/generate-blog", { textContent: originalSource.content });
          setBlog(res.data.blogPost || "");
          updateCurrentSessionContent('blog', res.data.blogPost, {
            contentId: res.data.contentId,
            source: 'text',
            fileName: originalSource.fileName
          });
        } else if (tabId === "slides") {
          res = await api.post("/generate-slides", { textContent: originalSource.content });
          setPptxBase64(res.data.pptxBase64 || "");
          setSlides(res.data.slides || []);
          updateCurrentSessionContent('slides', res.data.slides, {
            contentId: res.data.contentId,
            source: 'text',
            fileName: originalSource.fileName,
            pptxBase64: res.data.pptxBase64
          });
        } else if (tabId === "flashcards") {
          res = await api.post("/generate-flashcards", { textContent: originalSource.content });
          setFlashcards(res.data.flashcards || []);
          updateCurrentSessionContent('flashcards', res.data.flashcards, {
            contentId: res.data.contentId,
            source: 'text',
            fileName: originalSource.fileName
          });
        } else if (tabId === "quiz") {
          res = await api.post("/generate-quiz", { textContent: originalSource.content });
          setQuiz(res.data.quiz || []);
          updateCurrentSessionContent('quiz', res.data.quiz, {
            contentId: res.data.contentId,
            source: 'text',
            fileName: originalSource.fileName
          });
        } else if (tabId === "summary") {
          res = await api.post("/generate-summary", { textContent: originalSource.content });
          setSummary(res.data.summary || "");
          updateCurrentSessionContent('summary', res.data.summary, {
            contentId: res.data.contentId,
            source: 'text',
            fileName: originalSource.fileName
          });
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
  const hasContent = videoId || isFileValidated || originalSource?.content;

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
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className={`${showContentLayout ? 'px-4 py-8' : 'max-w-4xl mx-auto px-4 py-16'}`}>
        {/* Header */}
        {!showContentLayout && (
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What do you want to learn?
            </h1>
          </div>
        )}

        {/* Input Method Cards */}
        {!showContentLayout && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Upload Card */}
          <div 
            className={`relative bg-white border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${
              uploadMode === "file" ? "border-blue-500 shadow-lg" : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => {
              setUploadMode("file");
              resetStates();
            }}
          >
            <div className="absolute top-3 right-3">
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                Popular
              </span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload size={32} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload</h3>
              <p className="text-sm text-gray-600">File, audio, video</p>
            </div>
          </div>

          {/* Paste Card */}
          <div 
            className={`bg-white border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${
              uploadMode === "youtube" ? "border-blue-500 shadow-lg" : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => {
              setUploadMode("youtube");
              setShowPasteModal(true);
              resetStates();
            }}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Link size={32} className="text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Paste</h3>
              <p className="text-sm text-gray-600">YouTube, website, text</p>
            </div>
          </div>

          {/* Record Card */}
          <div 
            className="bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-gray-300"
            onClick={() => {
              // Future feature - recording functionality
              alert("Recording feature coming soon!");
            }}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Record</h3>
              <p className="text-sm text-gray-600">Record class, video call</p>
            </div>
          </div>
        </div>
        )}

        {/* File Upload Area (shown when file mode is selected) */}
        {!showContentLayout && uploadMode === "file" && (
          <div className="max-w-3xl mx-auto mt-6">
            <div
              className={`relative border-2 ${
                dragActive ? "border-blue-500 bg-blue-50" : "border-dashed border-gray-300"
              } rounded-2xl p-8 text-center transition-all ${
                isLoading ? "opacity-50 cursor-not-allowed" : "hover:border-blue-400 hover:bg-gray-50"
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
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <Upload size={32} className="text-blue-600" />
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 font-semibold text-lg"
                    disabled={isLoading}
                  >
                    Click to upload
                  </button>
                  <span className="text-gray-600 text-lg">
                    {" "}or drag and drop
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  PDF, DOCX, TXT, PPTX (max 10MB)
                </p>
                {selectedFile && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-sm text-green-700 font-medium">
                        Selected: {selectedFile.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {!showContentLayout && error && (
          <div className="max-w-3xl mx-auto mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Content Layout - only show after generate is clicked */}
        {showContentLayout && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Left column: Video Player - Takes 2/3 of the space */}
            <div className="lg:col-span-2 flex flex-col">
              {uploadMode === "youtube" && videoId && (
                <div 
                  ref={videoContainerRef}
                  className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-700 ease-in-out flex flex-col h-full ${
                    showVideo 
                      ? "opacity-100 transform translate-y-0" 
                      : "opacity-0 transform -translate-y-10"
                  }`}
                >
                  {/* Video Player - Proper aspect ratio */}
                  <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  
                  {/* Video Info - Compact footer */}
                  <div className="p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 font-medium">Ready for processing</span>
                      </div>
                      
                      {/* Action Buttons - More professional */}
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors flex items-center space-x-1">
                          <FileText size={14} />
                          <span>Chapters</span>
                        </button>
                        <button className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors flex items-center space-x-1">
                          <BookOpen size={14} />
                          <span>Transcript</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {uploadMode === "file" && selectedFile && (
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex-1 flex flex-col">
                  {/* File Header */}
                  <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 font-medium">Ready for processing</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* File Preview - Takes remaining space */}
                  <div className="flex-1 p-4">
                    {selectedFile.type === "application/pdf" && (
                      <div className="h-full border border-gray-200 rounded-lg overflow-hidden">
                        <PDFViewer file={selectedFile} />
                      </div>
                    )}
                  </div>
                  
                  {/* Remove File Button */}
                  <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setIsFileValidated(false);
                        setShowContentLayout(false);
                        setActiveTab("");
                        setBlog("");
                        setPptxBase64("");
                        setSlides([]);
                        setFlashcards([]);
                        setQuiz([]);
                        setSummary("");
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
                      }}
                      className="text-sm text-red-500 hover:text-red-700 transition-colors font-medium"
                    >
                      Remove file
                    </button>
                  </div>
                </div>
              )}
            </div>

        {/* Right column: Learning Materials - Takes 1/3 of the space */}
        <div className="lg:col-span-1 flex flex-col h-full">
          {/* Learning Materials Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Target size={20} className="text-gray-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Learning Materials</h3>
                  <p className="text-sm text-gray-500">Generate educational content from your source</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600 font-medium">AI Ready</span>
              </div>
            </div>
            
            {/* Professional Content Generation Grid */}
            <div className="grid grid-cols-1 gap-4">
              {[
                { 
                  id: "summary", 
                  label: "Summary", 
                  description: "Key points and overview",
                  icon: FileText,
                  color: "text-gray-600"
                },
                { 
                  id: "blog", 
                  label: "Blog Post", 
                  description: "Detailed article format",
                  icon: BookOpen,
                  color: "text-gray-600"
                },
                { 
                  id: "slides", 
                  label: "Presentation", 
                  description: "Slide deck with visuals",
                  icon: StickyNote,
                  color: "text-gray-600"
                },
                { 
                  id: "flashcards", 
                  label: "Flashcards", 
                  description: "Study cards for memorization",
                  icon: ListChecks,
                  color: "text-gray-600"
                },
                { 
                  id: "quiz", 
                  label: "Quiz", 
                  description: "Test comprehension",
                  icon: MessageCircle,
                  color: "text-gray-600"
                },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const isDisabled = !hasContent;
                const isLoading = loadingStates[tab.id];
                const hasError = errors[tab.id];

                return (
                  <button
                    key={tab.id}
                    className={`p-4 rounded-xl text-left transition-all duration-200 border ${
                      isDisabled
                        ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200"
                        : isActive
                        ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    }`}
                    onClick={() => !isDisabled && handleTabClick(tab.id)}
                    disabled={isDisabled}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isActive ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <tab.icon size={16} className={isActive ? 'text-blue-600' : tab.color} />
                        </div>
                        <div>
                          <div className="font-medium">{tab.label}</div>
                          <div className="text-sm text-gray-500">{tab.description}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {isLoading && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        )}
                        {hasError && (
                          <div className="text-red-500 text-xs">Error</div>
                        )}
                        {isActive && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
        )}
      </div>
      
      {/* Generated Content Section - Full width below main container */}
      {hasContent && (
        <div className="w-full px-4 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-8">
                {activeTab === "blog" && (
                  <div>
                    {loadingStates.blog && (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 text-lg">Generating blog post...</p>
                      </div>
                    )}
                    {errors.blog && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700">{errors.blog}</p>
                      </div>
                    )}
                    {!loadingStates.blog && !errors.blog && <BlogView blog={blog} />}
                  </div>
                )}
                {activeTab === "slides" && (
                  <div>
                    {loadingStates.slides && (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 text-lg">Generating slides...</p>
                      </div>
                    )}
                    {errors.slides && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700">{errors.slides}</p>
                      </div>
                    )}
                    {!loadingStates.slides && !errors.slides && (
                      <SlidesView pptxBase64={pptxBase64} slides={slides} />
                    )}
                  </div>
                )}
                {activeTab === "flashcards" && (
                  <div>
                    {loadingStates.flashcards && (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 text-lg">Generating flashcards...</p>
                      </div>
                    )}
                    {errors.flashcards && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700">{errors.flashcards}</p>
                      </div>
                    )}
                    {!loadingStates.flashcards && !errors.flashcards && (
                      <FlashCardGallery flashcards={flashcards} />
                    )}
                  </div>
                )}
                {activeTab === "quiz" && (
                  <div>
                    {loadingStates.quiz && (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 text-lg">Generating quiz...</p>
                      </div>
                    )}
                    {errors.quiz && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700">{errors.quiz}</p>
                      </div>
                    )}
                    {!loadingStates.quiz && !errors.quiz && <QuizView quiz={quiz} />}
                  </div>
                )}
                {activeTab === "summary" && (
                  <div>
                    {loadingStates.summary && (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 text-lg">Generating summary...</p>
                      </div>
                    )}
                    {errors.summary && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700">{errors.summary}</p>
                      </div>
                    )}
                    {!loadingStates.summary && !errors.summary && <SummaryView summary={summary} />}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal and Chatbot */}
      <PasteModal 
        isOpen={showPasteModal} 
        onClose={() => setShowPasteModal(false)} 
        onSubmit={handleModalSubmit}
      />
      
      <ChatBot isOpen={chatOpen} setIsOpen={setChatOpen} />
    </div>
  );
}

export default Dashboard;