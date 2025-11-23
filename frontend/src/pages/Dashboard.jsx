import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../utils/axios";
import BlogView from "../components/BlogView";
import SlidesView from "../components/SlidesView";
import FlashCardGallery from "../components/FlashCardGallery";
import QuizView from "../components/QuizView";
import SummaryView from "../components/SummaryView";
import PDFViewer from "../components/PDFViewer";
import LoaderSpinner from "../components/LoaderSpinner";
import ChatBot from "../components/ChatBot";
import EmbeddedChat from "../components/EmbeddedChat";
import PasteModal from "../components/PasteModal";
import FileUploadModal from "../components/FileUploadModal";
import useContentContext from "../hooks/useContentContext";
import "./Dashboard.css";
import { MessageCircle, BookOpen, ListChecks, FileText, StickyNote, Upload, Youtube, Link, Target, Bot, Sparkles, TrendingUp, Clock, Zap } from "lucide-react";
import { useAuth } from "../context/FirebaseAuthContext";
import { useNotification } from "../context/NotificationContext";
import AuthModal from "../components/AuthModal";

function Dashboard() {
  const [searchParams] = useSearchParams();
  const { showInfo } = useNotification();
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
  const extensionFileGeneratedRef = useRef(false);
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
  const { user, toggleAuthModal } = useAuth();
  const navigate = useNavigate();
  
  const [recentContent, setRecentContent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState("");
  const [spaces, setSpaces] = useState([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState("");
  
  const typeLabels = {
    blog: "Blog",
    summary: "Summary",
    quiz: "Quiz",
    flashcards: "Flashcards",
    slides: "Slides",
    other: "Content"
  };
  
  const typeIcons = {
    blog: FileText,
    summary: BookOpen,
    quiz: ListChecks,
    flashcards: MessageCircle,
    slides: StickyNote
  };
  
  // Playlist detection states
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [isCheckingUrl, setIsCheckingUrl] = useState(false);
  
  // Playlist processing progress states
  const [playlistProcessing, setPlaylistProcessing] = useState(false);
  const [playlistProgress, setPlaylistProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [playlistContentType, setPlaylistContentType] = useState('');
  
  // Modal and chatbot states
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
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

  const formatContentDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric"
    });
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
  };

  useEffect(() => {
    if (!user) {
      setRecentContent([]);
      setRecentError("");
      setRecentLoading(false);
      return;
    }

    const fetchContentOverview = async () => {
      try {
        setRecentLoading(true);
        setRecentError("");
        const response = await api.get("/api/content");
        const payload = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.content)
            ? response.data.content
            : [];

        const sortedItems = [...payload].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        setRecentContent(sortedItems.slice(0, 6));
      } catch (err) {
        console.error("Failed to fetch dashboard content:", err);
        setRecentError("Unable to load your recent activity.");
      } finally {
        setRecentLoading(false);
      }
    };

    fetchContentOverview();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSpaces([]);
      setSpacesError("");
      setSpacesLoading(false);
      return;
    }

    const fetchSpaces = async () => {
      try {
        setSpacesLoading(true);
        setSpacesError("");
        const response = await api.get("/api/collaborate/spaces", {
          params: { limit: 8 }
        });

        const list = Array.isArray(response.data?.spaces)
          ? response.data.spaces
          : Array.isArray(response.data)
            ? response.data
            : [];

        setSpaces(list);
      } catch (err) {
        console.error("Failed to load collaboration spaces:", err);
        setSpacesError("Unable to load your spaces right now.");
      } finally {
        setSpacesLoading(false);
      }
    };

    fetchSpaces();
  }, [user]);

  // Debug: Watch for changes in originalSource
  useEffect(() => {
    console.log('Original source changed:', originalSource);
    if (originalSource) {
      const context = getContextForChat();
      console.log('Context after original source change:', context);
    }
  }, [originalSource, getContextForChat]);


  // Handle URL parameters from Chrome Extension (set url and tab, then trigger generation only after both are set)
  const [extensionAutoGen, setExtensionAutoGen] = useState(false);
  useEffect(() => {
    const urlParam = searchParams.get('url');
    const typeParam = searchParams.get('type');
    const modeParam = searchParams.get('mode');
    
    // Handle file mode from extension
    if (modeParam === 'file' && typeParam) {
      setUploadMode('file');
      setActiveTab(typeParam.toLowerCase());
      setExtensionAutoGen(true);
      // Don't set showContentLayout yet - wait for file upload
      return;
    }
    
    // Handle YouTube mode from extension
    if (urlParam && typeParam) {
      const decodedUrl = decodeURIComponent(urlParam);
      // Extract video ID immediately
      const videoIdMatch = decodedUrl.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
      if (videoIdMatch) {
        const extractedVideoId = videoIdMatch[1];
        setVideoId(extractedVideoId);
        setShowVideo(true);
        setShowContentLayout(true);
      }
      setUrl(decodedUrl);
      setUploadMode('youtube');
      setActiveTab(typeParam.toLowerCase());
      setExtensionAutoGen(true);
    }
  }, [searchParams]);

  // Trigger content generation only after both url and activeTab are set from extension
  useEffect(() => {
    // For YouTube mode, generate when url and activeTab are set
    if (extensionAutoGen && uploadMode === 'youtube' && url && activeTab) {
      handleTabClick(activeTab);
      setExtensionAutoGen(false); // Prevent repeat
    }
    // For file mode, just set the tab (file upload will trigger generation)
    if (extensionAutoGen && uploadMode === 'file' && activeTab) {
      setExtensionAutoGen(false); // Prevent repeat
      // File mode is ready, user needs to upload file
    }
  }, [extensionAutoGen, url, activeTab, uploadMode]);

  // Handle file retrieval from Chrome extension
  useEffect(() => {
    const fileId = searchParams.get('fileId');
    const typeParam = searchParams.get('type');
    if (fileId && uploadMode === 'file' && typeParam) {
      // Listen for file data from extension content script
      const handleFileMessage = async (event) => {
        if (event.data && event.data.type === 'EDUEXTRACT_FILE_DATA' && event.data.fileId === fileId) {
          const fileData = event.data.fileData;
          
          // Convert base64 data URL back to File object
          const byteString = atob(fileData.data.split(',')[1]);
          const mimeString = fileData.data.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          const file = new File([blob], fileData.name, { type: fileData.type });
          
          // Set the file and extract content
          await handleFileSelect(file);
          
          // Enable tabs by setting isFileValidated
          setIsFileValidated(true);
          
          // Remove listener
          window.removeEventListener('message', handleFileMessage);
        }
      };
      
      window.addEventListener('message', handleFileMessage);
      
      // Request file from extension
      window.postMessage({ type: 'EDUEXTRACT_REQUEST_FILE', fileId }, '*');
      
      return () => {
        window.removeEventListener('message', handleFileMessage);
      };
    }
  }, [searchParams, uploadMode]);

  // Auto-generate content when file is loaded from extension
  useEffect(() => {
    const fileId = searchParams.get('fileId');
    const typeParam = searchParams.get('type');
    
    // Only auto-generate if we have fileId, type, file is loaded, content extracted, and not already generated
    if (fileId && uploadMode === 'file' && typeParam && activeTab && 
        selectedFile && fileContent && !isExtractingContent && 
        !extensionFileGeneratedRef.current && activeTab === typeParam.toLowerCase()) {
      // File is ready - first show content layout and ensure tab is set
      extensionFileGeneratedRef.current = true;
      setShowContentLayout(true); // Show content area instead of upload area
      setActiveTab(typeParam.toLowerCase()); // Ensure tab is set
      
      console.log('Auto-generating content for file from extension:', activeTab);
      
      // Wait a bit longer to ensure UI is updated and tab is visible
      setTimeout(() => {
        // Ensure we're on the right tab before generating
        if (activeTab === typeParam.toLowerCase()) {
          handleTabClick(activeTab);
        }
      }, 500);
    }
    
    // Reset flag when fileId changes or when file is cleared
    if (!fileId || !selectedFile) {
      extensionFileGeneratedRef.current = false;
    }
  }, [fileContent, selectedFile, activeTab, uploadMode, searchParams, isExtractingContent]);

  // Detect playlist when URL changes
  useEffect(() => {
    const detectPlaylist = async () => {
      if (!url || url.trim() === '') {
        setIsPlaylist(false);
        setPlaylistInfo(null);
        return;
      }

      // Quick client-side check first
      if (!url.includes('list=')) {
        setIsPlaylist(false);
        setPlaylistInfo(null);
        return;
      }

      setIsCheckingUrl(true);
      try {
        const token = user ? await user.getIdToken() : null;
        const response = await api.post('/check-url-type', 
          { url },
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );

        if (response.data.type === 'playlist') {
          setIsPlaylist(true);
          setPlaylistInfo(response.data);
          console.log('Playlist detected:', response.data);
        } else {
          setIsPlaylist(false);
          setPlaylistInfo(null);
        }
      } catch (error) {
        console.error('Error checking URL type:', error);
        setIsPlaylist(false);
        setPlaylistInfo(null);
      } finally {
        setIsCheckingUrl(false);
      }
    };

    // Debounce the detection
    const timeoutId = setTimeout(detectPlaylist, 500);
    return () => clearTimeout(timeoutId);
  }, [url, user]);

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
    // Check if user is authenticated
    if (!user) {
      toggleAuthModal(true);
      return;
    }
    
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
    // Check if user is authenticated
    if (!user) {
      toggleAuthModal(true);
      return;
    }
    
    // Check if it's a playlist - if so, handle differently
    if (isPlaylist && playlistInfo) {
      // For playlists, don't extract video ID - use playlist handling
      setError("");
      setIsLoading(false); // Don't show loading yet
      setBlog("");
      setPptxBase64("");
      setSlides([]);
      setFlashcards([]);
      setQuiz([]);
      setSummary("");
      setVideoId(""); // No single video ID for playlists
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
      
      // Show playlist info and wait for user to select content type
      setShowContentLayout(true);
      return;
    }
    
    // Original single video handling
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
    // Check if user is authenticated
    if (!user) {
      toggleAuthModal(true);
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

  // Handle file content processing
  const processFileContent = async () => {
    console.log('Processing file content:', { fileContent: fileContent?.length, selectedFile: selectedFile?.name });
    
    // Check if user is authenticated
    if (!user) {
      toggleAuthModal(true);
      return;
    }
    
    if (!fileContent || fileContent.trim().length === 0) {
      setError("No content extracted from file. Please try a different file.");
      setIsLoading(false);
      return;
    }

    setError("");
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
      console.log('Creating/updating user...');
      // Create or update user record
      await createOrUpdateUser();
      console.log('User created/updated successfully');
      
      console.log('Setting original source...');
      // Set the original source for context
      setOriginalSourceContent({
        content: fileContent,
        type: 'file',
        fileName: selectedFile.name
      });
      console.log('Original source set successfully');
      
      console.log('Enabling tabs and showing layout...');
      // Validate the file content and enable tabs
      setIsLoading(false);
      setIsFileValidated(true);  // Enable the tabs
      setShowContentLayout(true);  // Show the content layout
      console.log('File processing completed successfully');
    } catch (err) {
      console.error('Error in processFileContent:', err);
      setError(err.response?.data?.error || err.message || "Failed to process file content");
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
    
    // Check if user is authenticated
    if (!user) {
      toggleAuthModal(true);
      return;
    }
    
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
    
    // Check if user is authenticated
    if (!user) {
      toggleAuthModal(true);
      return;
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (file) => {
    // Check if user is authenticated
    if (!user) {
      toggleAuthModal(true);
      return;
    }
    
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
    // Check if user is authenticated
    if (!user) {
      toggleAuthModal(true);
      return;
    }
    
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
    console.log('Tab clicked:', tabId);
    console.log('Current state - videoId:', videoId, 'selectedFile:', selectedFile, 'originalSource:', originalSource);
    console.log('Playlist state - isPlaylist:', isPlaylist, 'playlistInfo:', playlistInfo);
    
    // Check if user is authenticated
    if (!user) {
      toggleAuthModal(true);
      return;
    }
    
    // Check if we have content to process (video, file, text, or playlist)
    if (!videoId && !selectedFile && !originalSource?.content && !(isPlaylist && playlistInfo)) {
      console.log('No content available to process');
      return;
    }
    
    // Set active tab first to show the correct view
    setActiveTab(tabId);
    setShowContentLayout(true); // Ensure content layout is shown
    
    // If content is already loaded for this tab, just show it
    if (loaded[tabId]) {
      return;
    }
    
    setLoadingStates(prev => ({ ...prev, [tabId]: true }));
    setErrors(prev => ({ ...prev, [tabId]: "" }));
    
    try {
      // Create or update user record before generating content
      await createOrUpdateUser();
      
        // If Chat tab is clicked, fetch transcript/file content for context
        if (tabId === "chat") {
          if (videoId && url) {
            // Fetch transcript for YouTube video
            try {
              console.log('Fetching transcript for chat context...');
              const transcriptResponse = await api.post('/api/transcript', { url });
              const transcriptText = transcriptResponse.data.transcript;
              
              if (transcriptText && transcriptText.trim().length > 0) {
                console.log('Transcript fetched, storing in context...');
                setOriginalSourceContent({
                  type: 'youtube',
                  url: url,
                  videoId: videoId,
                  content: transcriptText
                });
                console.log('Transcript fetched and stored in context for chat:', transcriptText.substring(0, 100) + '...');
                
                // Store context in database for chat component
                try {
                  const context = {
                    currentSession: {},
                    originalSource: {
                      type: 'youtube',
                      url: url,
                      videoId: videoId,
                      content: transcriptText
                    },
                    metadata: {
                      hasCurrentSession: false,
                      hasOriginalSource: true,
                      totalHistoryItems: 0
                    }
                  };
                  
                  await api.post('/api/chat/context/store', { context });
                  console.log('Context stored in database for chat');
                } catch (contextError) {
                  console.error('Error storing context in database:', contextError);
                }
              }
            } catch (transcriptError) {
              console.error('Error fetching transcript for chat:', transcriptError);
            }
          } else if (selectedFile && fileContent) {
            // Use file content for context
            setOriginalSourceContent({
              type: 'file',
              fileName: selectedFile.name,
              fileType: selectedFile.type,
              content: fileContent
            });
            console.log('File content stored in context for chat');
            
            // Store context in database for chat component
            try {
              const context = {
                currentSession: {},
                originalSource: {
                  type: 'file',
                  fileName: selectedFile.name,
                  fileType: selectedFile.type,
                  content: fileContent
                },
                metadata: {
                  hasCurrentSession: false,
                  hasOriginalSource: true,
                  totalHistoryItems: 0
                }
              };
              
              await api.post('/api/chat/context/store', { context });
              console.log('File context stored in database for chat');
            } catch (contextError) {
              console.error('Error storing file context in database:', contextError);
            }
          }
          
          // Mark chat as loaded and return early
          setLoaded(prev => ({ ...prev, [tabId]: true }));
          setLoadingStates(prev => ({ ...prev, [tabId]: false }));
          return;
        }
      
      let res;
      console.log('Processing content - videoId:', videoId, 'isPlaylist:', isPlaylist, 'playlistInfo:', playlistInfo);
      console.log('URL state variable:', url);
      console.log('OriginalSource URL:', originalSource?.url);
      
      if (videoId) {
        console.log('Processing as single video');
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
      } else if (isPlaylist && playlistInfo) {
        // Handle playlist content generation
        console.log('Processing as playlist - Starting transcript fetch for', playlistInfo.video_count, 'videos');
        const playlistUrl = url || originalSource?.url;
        console.log('Playlist URL:', playlistUrl);
        console.log('Content Type:', tabId);
        
        if (!playlistUrl) {
          throw new Error('Playlist URL not found');
        }
        
        // Show progress modal
        setPlaylistProcessing(true);
        setPlaylistContentType(tabId.charAt(0).toUpperCase() + tabId.slice(1));
        setPlaylistProgress({ current: 0, total: playlistInfo.video_count, percentage: 0 });
        
        // Simulate progress (since backend processes all at once, we estimate based on 5 sec per video)
        const progressInterval = setInterval(() => {
          setPlaylistProgress(prev => {
            if (prev.current < prev.total) {
              const newCurrent = prev.current + 1;
              const newPercentage = (newCurrent / prev.total) * 85; // Reserve 15% for content generation
              return { current: newCurrent, total: prev.total, percentage: newPercentage };
            }
            return prev;
          });
        }, 5000); // Update every 5 seconds (matching backend delay)
        
        try {
          // First, fetch the combined transcript from all videos in the playlist
          const playlistRes = await api.post("/generate-from-playlist", { 
            url: playlistUrl,
            contentType: tabId
          });
          const combinedTranscript = playlistRes.data.combined_transcript;
          
          // Clear progress interval and update to show generation phase
          clearInterval(progressInterval);
          setPlaylistProgress({ 
            current: playlistInfo.video_count, 
            total: playlistInfo.video_count, 
            percentage: 85 
          });
          
          console.log(`Combined transcript from ${playlistRes.data.total_videos} videos (${playlistRes.data.processed_videos} successful)`);
        
          // Now use the combined transcript to generate the requested content type
          // Update progress to 90% while generating
          setPlaylistProgress(prev => ({ ...prev, percentage: 90 }));
          
          if (tabId === "blog") {
            res = await api.post("/generate-blog", { textContent: combinedTranscript });
            setBlog(res.data.blogPost || "");
            updateCurrentSessionContent('blog', res.data.blogPost, {
              contentId: res.data.contentId,
              source: 'youtube-playlist',
              url: playlistUrl,
              playlistInfo: playlistInfo
            });
          } else if (tabId === "slides") {
            res = await api.post("/generate-slides", { textContent: combinedTranscript });
            setPptxBase64(res.data.pptxBase64 || "");
            setSlides(res.data.slides || []);
            updateCurrentSessionContent('slides', res.data.slides, {
              contentId: res.data.contentId,
              source: 'youtube-playlist',
              url: playlistUrl,
              playlistInfo: playlistInfo,
              pptxBase64: res.data.pptxBase64
            });
          } else if (tabId === "flashcards") {
            res = await api.post("/generate-flashcards", { textContent: combinedTranscript });
            setFlashcards(res.data.flashcards || []);
            updateCurrentSessionContent('flashcards', res.data.flashcards, {
              contentId: res.data.contentId,
              source: 'youtube-playlist',
              url: playlistUrl,
              playlistInfo: playlistInfo
            });
          } else if (tabId === "quiz") {
            res = await api.post("/generate-quiz", { textContent: combinedTranscript });
            setQuiz(res.data.quiz || []);
            updateCurrentSessionContent('quiz', res.data.quiz, {
              contentId: res.data.contentId,
              source: 'youtube-playlist',
              url: playlistUrl,
              playlistInfo: playlistInfo
            });
          } else if (tabId === "summary") {
            res = await api.post("/generate-summary", { textContent: combinedTranscript });
            setSummary(res.data.summary || "");
            updateCurrentSessionContent('summary', res.data.summary, {
              contentId: res.data.contentId,
              source: 'youtube-playlist',
              url: playlistUrl,
              playlistInfo: playlistInfo
            });
          }
          
          // Complete progress
          setPlaylistProgress(prev => ({ ...prev, percentage: 100 }));
          
          // Close modal after a brief delay
          setTimeout(() => {
            setPlaylistProcessing(false);
            setPlaylistProgress({ current: 0, total: 0, percentage: 0 });
          }, 800);
          
        } catch (playlistError) {
          clearInterval(progressInterval);
          setPlaylistProcessing(false);
          throw playlistError;
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
          
          // Mark as loaded after successful file processing
          setLoaded(prev => ({ ...prev, [tabId]: true }));
        } catch (error) {
          console.error("Error processing file:", error);
          setErrors(prev => ({
            ...prev,
            [tabId]: error.response?.data?.error || error.message || `Failed to process ${tabId}`
          }));
          setLoadingStates(prev => ({ ...prev, [tabId]: false }));
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
  const hasContent = videoId || isFileValidated || originalSource?.content || (isPlaylist && playlistInfo);

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

  // Calculate stats for dashboard
  const totalContent = recentContent.length;
  const totalSpaces = spaces.length;
  const recentCount = recentContent.filter(item => {
    const date = new Date(item.createdAt);
    const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }).length;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const cardHoverVariants = {
    rest: { scale: 1, y: 0 },
    hover: { 
      scale: 1.02, 
      y: -4,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] relative">

      {/* Main Content */}
      <div className={`relative z-10 ${showContentLayout ? 'px-4 py-8' : 'max-w-7xl mx-auto px-4 py-8'}`}>
        {/* Header */}
        {!showContentLayout && (
          <>
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.h1 
                className="text-2xl md:text-4xl font-bold text-[#171717] dark:text-[#fafafa] mb-4 relative inline-block"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <span className="relative z-10">What do you want to learn?</span>
                <motion.div
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-[#171717]/20 via-[#171717]/40 to-[#171717]/20 dark:from-[#fafafa]/20 dark:via-[#fafafa]/40 dark:to-[#fafafa]/20 rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                />
              </motion.h1>
              <motion.p 
                className="text-base md:text-lg text-[#171717cc] dark:text-[#fafafacc] max-w-2xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Transform any content into engaging learning materials with AI-powered tools
              </motion.p>
            </motion.div>

            {/* Stats Cards */}
            {user && (
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] font-medium mb-1">Total Content</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalContent}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center border border-blue-200 dark:border-blue-800/50">
                      <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] font-medium mb-1">Collaboration Spaces</p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalSpaces}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center border border-purple-200 dark:border-purple-800/50">
                      <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] font-medium mb-1">This Week</p>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{recentCount}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center border border-emerald-200 dark:border-emerald-800/50">
                      <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Input Method Cards */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Upload Card */}
              <motion.div
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
                className={`relative bg-white dark:bg-[#171717] border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 overflow-hidden group ${
                  uploadMode === "file" 
                    ? "border-blue-500 dark:border-blue-400 shadow-2xl shadow-blue-500/10" 
                    : "border-gray-200 dark:border-[#fafafa1a] hover:border-blue-300 dark:hover:border-blue-500/50"
                }`}
                onClick={() => {
                  if (!user) {
                    toggleAuthModal(true);
                    return;
                  }
                  setUploadMode("file");
                  setShowFileUploadModal(true);
                  resetStates();
                }}
              >
                <div className="absolute inset-0 bg-blue-500/0 dark:bg-blue-400/0 group-hover:bg-blue-500/5 dark:group-hover:bg-blue-400/5 transition-all duration-300"></div>
                <div className="absolute top-4 right-4">
                  <motion.span 
                    className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 border border-blue-200 dark:border-blue-800/50"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Zap className="w-3 h-3" />
                    Popular
                  </motion.span>
                </div>
                <div className="text-center relative z-10">
                  <motion.div 
                    className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-blue-200 dark:border-blue-800/50"
                    whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Upload size={36} className="text-blue-600 dark:text-blue-400" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-[#171717] dark:text-[#fafafa] mb-2">Upload</h3>
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">File, audio, video</p>
                </div>
              </motion.div>

              {/* Paste Card */}
              <motion.div
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
                className={`relative bg-white dark:bg-[#171717] border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 overflow-hidden group ${
                  uploadMode === "youtube" 
                    ? "border-purple-500 dark:border-purple-400 shadow-2xl shadow-purple-500/10" 
                    : "border-gray-200 dark:border-[#fafafa1a] hover:border-purple-300 dark:hover:border-purple-500/50"
                }`}
                onClick={() => {
                  if (!user) {
                    toggleAuthModal(true);
                    return;
                  }
                  setUploadMode("youtube");
                  setShowPasteModal(true);
                  resetStates();
                }}
              >
                <div className="absolute inset-0 bg-purple-500/0 dark:bg-purple-400/0 group-hover:bg-purple-500/5 dark:group-hover:bg-purple-400/5 transition-all duration-300"></div>
                <div className="text-center relative z-10">
                  <motion.div 
                    className="w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-purple-200 dark:border-purple-800/50"
                    whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Link size={36} className="text-purple-600 dark:text-purple-400" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-[#171717] dark:text-[#fafafa] mb-2">Paste</h3>
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">YouTube, website, text</p>
                </div>
              </motion.div>

              {/* Record Card */}
              <motion.div
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
                className="relative bg-white dark:bg-[#171717] border-2 border-gray-200 dark:border-[#fafafa1a] rounded-2xl p-6 cursor-pointer transition-all duration-300 overflow-hidden group hover:border-orange-300 dark:hover:border-orange-500/50"
                onClick={() => {
                  if (!user) {
                    toggleAuthModal(true);
                    return;
                  }
                  showInfo("Recording feature coming soon!", { 
                    title: "Feature Coming Soon" 
                  });
                }}
              >
                <div className="absolute inset-0 bg-orange-500/0 dark:bg-orange-400/0 group-hover:bg-orange-500/5 dark:group-hover:bg-orange-400/5 transition-all duration-300"></div>
                <div className="text-center relative z-10">
                  <motion.div 
                    className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-orange-200 dark:border-orange-800/50"
                    whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <svg className="w-9 h-9 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </motion.div>
                  <h3 className="text-lg font-bold text-[#171717] dark:text-[#fafafa] mb-2">Record</h3>
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Record class, video call</p>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
        

        {/* Dashboard Overview */}
        {!showContentLayout && (
          <>
            {user && (
              <div className="space-y-6 mb-6">
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <motion.h2 
                      className="text-xl font-bold text-[#171717] dark:text-[#fafafa] flex items-center gap-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      My Spaces
                    </motion.h2>
                    <motion.button
                      type="button"
                      onClick={() => navigate('/collaborate')}
                      className="text-sm font-semibold text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] transition-colors flex items-center gap-1"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      View all
                      <span>→</span>
                    </motion.button>
                  </div>
                  {spacesError && (
                    <p className="text-xs text-red-600 dark:text-red-400 mb-2">{spacesError}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <motion.button
                      type="button"
                      onClick={() => navigate('/collaborate')}
                      className="h-full min-h-[150px] border-2 border-dashed border-gray-300 dark:border-[#fafafa1a] rounded-xl flex flex-col items-center justify-center text-sm font-semibold text-[#171717cc] dark:text-[#fafafacc] hover:border-purple-400 dark:hover:border-purple-500 transition-colors bg-white dark:bg-[#171717] group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.span 
                        className="text-3xl mb-2 text-purple-600 dark:text-purple-400"
                        whileHover={{ rotate: 90, scale: 1.2 }}
                        transition={{ duration: 0.3 }}
                      >
                        +
                      </motion.span>
                      Create Space
                    </motion.button>

                    <AnimatePresence>
                      {spacesLoading
                        ? Array.from({ length: 3 }).map((_, idx) => (
                            <motion.div 
                              key={idx} 
                              className="min-h-[150px] bg-gray-100 dark:bg-[#1E1E1E] rounded-xl animate-pulse"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            />
                          ))
                        : spaces.slice(0, 7).map((space, idx) => (
                            <motion.button
                              key={space._id}
                              type="button"
                              onClick={() => navigate(`/collaborate/space/${space._id}`)}
                              className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl p-4 text-left hover:shadow-xl transition-all duration-300 group overflow-hidden relative"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: idx * 0.1 }}
                              whileHover={{ scale: 1.02, y: -4 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="absolute inset-0 bg-purple-500/0 dark:bg-purple-400/0 group-hover:bg-purple-500/5 dark:group-hover:bg-purple-400/5 transition-all duration-300"></div>
                              <div className="relative z-10">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="text-sm font-semibold text-[#171717] dark:text-[#fafafa] truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                    {space.title || 'Untitled Space'}
                                  </h3>
                                  <span className="text-xs text-[#171717cc] dark:text-[#fafafacc] bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800/50">
                                    {space.stats?.totalContent || 0} content
                                  </span>
                                </div>
                                <p className="text-xs text-[#171717cc] dark:text-[#fafafacc] line-clamp-2 mb-3">
                                  {space.description || 'Collaborate with your team and manage shared learning content.'}
                                </p>
                                <div className="flex items-center justify-between text-[11px] text-[#171717cc] dark:text-[#fafafacc]">
                                  <span>{space.ownerName ? `by ${space.ownerName}` : 'Private space'}</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatRelativeTime(space.stats?.lastActivity || space.updatedAt)}
                                  </span>
                                </div>
                              </div>
                            </motion.button>
                          ))}
                    </AnimatePresence>
                  </div>
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <motion.h2 
                      className="text-xl font-bold text-[#171717] dark:text-[#fafafa] flex items-center gap-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                    >
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Recents
                    </motion.h2>
                    <motion.button
                      type="button"
                      onClick={() => navigate('/content')}
                      className="text-sm font-semibold text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] transition-colors flex items-center gap-1"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      View all
                      <span>→</span>
                    </motion.button>
                  </div>
                  {recentError && (
                    <p className="text-xs text-red-600 dark:text-red-400 mb-2">{recentError}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence>
                      {recentLoading
                        ? Array.from({ length: 4 }).map((_, idx) => (
                            <motion.div 
                              key={idx} 
                              className="min-h-[140px] bg-gray-100 dark:bg-[#1E1E1E] rounded-xl animate-pulse"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            />
                          ))
                        : recentContent.length > 0
                          ? recentContent.slice(0, 8).map((item, idx) => {
                              const Icon = typeIcons[item.type] || FileText;
                              return (
                                <motion.div
                                  key={item._id || item.title}
                                  className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl p-4 hover:shadow-xl transition-all duration-300 group overflow-hidden relative cursor-pointer"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                                  whileHover={{ scale: 1.02, y: -4 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => navigate(`/content/${item._id}`)}
                                >
                                  <div className="absolute inset-0 bg-blue-500/0 dark:bg-blue-400/0 group-hover:bg-blue-500/5 dark:group-hover:bg-blue-400/5 transition-all duration-300"></div>
                                  <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-3">
                                      <motion.div 
                                        className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shadow-md border border-blue-200 dark:border-blue-800/50"
                                        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                                        transition={{ duration: 0.3 }}
                                      >
                                        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                      </motion.div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-[#171717cc] dark:text-[#fafafacc] mb-1">
                                          {typeLabels[item.type] || 'Content'}
                                        </p>
                                        <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa] line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                          {item.title || 'Untitled'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-[#171717cc] dark:text-[#fafafacc]">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatContentDate(item.createdAt)}
                                      </span>
                                      {item.source && <span className="truncate max-w-[120px] text-right opacity-70">{item.source}</span>}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })
                          : (
                            <motion.div 
                              className="col-span-full text-sm text-[#171717cc] dark:text-[#fafafacc] bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl p-6 text-center"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <div className="w-16 h-16 bg-gray-100 dark:bg-[#1E1E1E] rounded-full flex items-center justify-center mx-auto mb-3">
                                <FileText className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                              </div>
                              You haven't generated any content yet. Start by uploading a document or pasting a link.
                            </motion.div>
                          )}
                    </AnimatePresence>
                  </div>
                </motion.section>
              </div>
            )}
          </>
        )}

        
        {!showContentLayout && error && (
          <div className="max-w-3xl mx-auto mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-red-700 dark:text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Content Layout - only show after generate is clicked */}
        {showContentLayout && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left column: File Preview - Takes 2/3 of the space */}
            <div className="lg:col-span-2 h-[500px] md:h-[520px] lg:h-[580px] flex flex-col">
              {uploadMode === "youtube" && videoId && (
                <div 
                  ref={videoContainerRef}
                  className={`bg-white dark:bg-[#171717] rounded-xl shadow-lg overflow-hidden transition-all duration-300 ease-in-out flex flex-col h-full max-h-full ${
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
                  <div className="p-4 border-t border-gray-200 dark:border-[#fafafa1a] bg-gray-50 dark:bg-[#1E1E1E] flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-[#171717cc] dark:text-[#fafafacc] font-medium">Ready for processing</span>
                      </div>
                      
                      {/* Action Buttons - More professional */}
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#2E2E2E] transition-colors flex items-center space-x-1">
                          <FileText size={14} />
                          <span>Chapters</span>
                        </button>
                        <button className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#2E2E2E] transition-colors flex items-center space-x-1">
                          <BookOpen size={14} />
                          <span>Transcript</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Playlist Info Display */}
              {isPlaylist && playlistInfo && (
                <div 
                  className="bg-white dark:bg-[#171717] rounded-xl shadow-lg overflow-hidden flex-1 flex flex-col h-full"
                >
                  {/* Playlist Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-[#fafafa1a] bg-gray-50 dark:bg-[#1E1E1E]">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ListChecks className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-[#171717] dark:text-[#fafafa] mb-1 truncate">
                          {playlistInfo.playlist_title || 'YouTube Playlist'}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="px-2.5 py-1 bg-blue-600 text-white rounded-full font-medium">
                            {playlistInfo.video_count} videos
                          </span>
                          <span className="text-[#171717cc] dark:text-[#fafafacc]">
                            Ready to process entire playlist
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Playlist Description */}
                  <div className="p-4 flex-1 overflow-y-auto">
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-600 p-4 rounded-lg">
                        <p className="text-sm text-blue-900 dark:text-blue-300 font-medium mb-2">
                          📚 Full Course Generation
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-400">
                          This playlist contains {playlistInfo.video_count} videos. 
                          Click any content type button on the right to generate comprehensive learning materials 
                          from all videos in this playlist.
                        </p>
                      </div>

                      <div className="bg-gray-50 dark:bg-[#1E1E1E] border-l-4 border-gray-600 dark:border-gray-500 p-4 rounded-lg">
                        <p className="text-sm text-[#171717] dark:text-[#fafafacc] font-medium mb-2">
                          ⏱️ Processing Time
                        </p>
                        <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                          Processing may take a few minutes as we fetch transcripts from all videos 
                          with appropriate delays (5 seconds between each video) to ensure reliability.
                        </p>
                      </div>

                      {/* Video List Preview */}
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-3">
                          Videos in this playlist:
                        </h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {playlistInfo.videos && playlistInfo.videos.slice(0, 10).map((video, index) => (
                            <div 
                              key={video.id || video.video_id || index}
                              className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-[#1E1E1E] rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors"
                            >
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#171717] dark:text-[#fafafa] font-medium truncate">
                                  {video.title || `Video ${index + 1}`}
                                </p>
                                {video.duration && (
                                  <p className="text-xs text-[#171717cc] dark:text-[#fafafacc] mt-0.5">
                                    Duration: {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          {playlistInfo.videos && playlistInfo.videos.length > 10 && (
                            <p className="text-xs text-[#171717cc] dark:text-[#fafafacc] text-center py-2">
                              ... and {playlistInfo.videos.length - 10} more videos
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Text Preview - For pasted text content */}
              {originalSource?.type === 'text' && originalSource?.content && (
                <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg overflow-hidden flex-1 flex flex-col h-full">
                  {/* Text Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-[#fafafa1a] bg-gray-50 dark:bg-[#1E1E1E]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                          <StickyNote className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-[#171717] dark:text-[#fafafa]">Pasted Text Content</p>
                          <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                            {originalSource.content.length} characters
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-[#171717cc] dark:text-[#fafafacc] font-medium">Ready for processing</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Text Content Display */}
                  <div className="flex-1 p-0 min-h-0">
                    <div className="w-full h-full border-gray-200 dark:border-[#fafafa1a] overflow-hidden bg-white dark:bg-[#171717]">
                      <div className="h-full overflow-y-auto p-4">
                        <div className="prose dark:prose-invert max-w-none">
                          <h3 className="text-base font-semibold text-[#171717] dark:text-[#fafafa] mb-4">Your Text</h3>
                          <div className="text-[#171717cc] dark:text-[#fafafacc] whitespace-pre-wrap leading-relaxed">
                            {originalSource.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Remove Text Button */}
                  <div className="p-4 border-t border-gray-200 dark:border-[#fafafa1a] bg-gray-50 dark:bg-[#1E1E1E] text-center">
                    <button
                      onClick={() => {
                        clearCurrentSession();
                        setOriginalSourceContent(null);
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
                      }}
                      className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium"
                    >
                      Clear Text
                    </button>
                  </div>
                </div>
              )}

              {uploadMode === "file" && selectedFile && (
                <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg overflow-hidden flex-1 flex flex-col h-full">
                  {/* File Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-[#fafafa1a] bg-gray-50 dark:bg-[#1E1E1E]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-[#171717] rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                        </div>
                        <div>
                          <p className="font-medium text-[#171717] dark:text-[#fafafa]">{selectedFile.name}</p>
                          <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-[#171717cc] dark:text-[#fafafacc] font-medium">Ready for processing</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* File Preview - Takes remaining space */}
                  <div className="flex-1 p-0 min-h-0">
                    {selectedFile.type === "application/pdf" && (
                      <div className="w-full h-full border-gray-200 dark:border-[#fafafa1a] overflow-hidden">
                        <PDFViewer file={selectedFile} />
                      </div>
                    )}
                    {selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && (
                      <div className="w-full h-full  border-gray-200 dark:border-[#fafafa1a]  overflow-hidden bg-white dark:bg-[#171717]">
                        <div className="h-full overflow-y-auto p-4">
                          <div className="prose dark:prose-invert max-w-none">
                            <h3 className="text-base font-semibold text-[#171717] dark:text-[#fafafa] mb-4">Document Content</h3>
                            <div className="text-[#171717cc] dark:text-[#fafafacc] whitespace-pre-wrap">
                              {fileContent || "Content is being extracted..."}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedFile.type === "text/plain" && (
                      <div className="w-full h-full  border-gray-200 dark:border-[#fafafa1a]  overflow-hidden bg-white dark:bg-[#171717]">
                        <div className="h-full overflow-y-auto p-4">
                          <div className="prose dark:prose-invert max-w-none">
                            <h3 className="text-base font-semibold text-[#171717] dark:text-[#fafafa] mb-4">Text Content</h3>
                            <div className="text-[#171717cc] dark:text-[#fafafacc] whitespace-pre-wrap">
                              {fileContent || "Content is being extracted..."}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedFile.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" && (
                      <div className="w-full h-full  border-gray-200 dark:border-[#fafafa1a]  overflow-hidden bg-white dark:bg-[#171717]">
                        <div className="h-full overflow-y-auto p-4">
                          <div className="prose dark:prose-invert max-w-none">
                            <h3 className="text-base font-semibold text-[#171717] dark:text-[#fafafa] mb-4">Presentation Content</h3>
                            <div className="text-[#171717cc] dark:text-[#fafafacc] whitespace-pre-wrap">
                              {fileContent || "Content is being extracted..."}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Remove File Button */}
                  <div className="p-4 border-t border-gray-200 dark:border-[#fafafa1a] bg-gray-50 dark:bg-[#1E1E1E] text-center">
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
                      className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors font-medium"
                    >
                      Remove file
                    </button>
                  </div>
                </div>
              )}
            </div>

        {/* Right column: Learning Materials Tabs - Takes 1/3 of the space */}
        <div className="lg:col-span-1 flex flex-col h-full">
          {/* Learning Materials Header */}
          <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg p-4 h-full flex flex-col max-h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-[#1E1E1E] rounded-xl flex items-center justify-center">
                  <Target size={20} className="text-[#171717cc] dark:text-[#fafafacc]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">Learning Materials</h3>
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Generate educational content from your source</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-[#171717cc] dark:text-[#fafafacc] font-medium">AI Ready</span>
              </div>
            </div>
            
            {/* Professional Content Generation Grid */}
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-0">
              {[
                { 
                  id: "chat", 
                  label: "Chat", 
                  description: "AI tutor conversation",
                  icon: Bot,
                  color: "text-gray-600"
                },
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
                    className={`p-3 rounded-lg text-left transition-all duration-200 border ${
                      isDisabled
                        ? "bg-gray-50 dark:bg-[#1E1E1E] text-gray-400 dark:text-[#fafafacc] cursor-not-allowed border-gray-200 dark:border-[#fafafa1a]"
                        : isActive
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-sm"
                        : "bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] border-gray-200 dark:border-[#fafafa1a] hover:border-gray-300 dark:hover:border-[#fafafa2a] hover:shadow-sm"
                    }`}
                    onClick={() => !isDisabled && handleTabClick(tab.id)}
                    disabled={isDisabled}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isActive ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-[#1E1E1E]'
                        }`}>
                          <tab.icon size={16} className={isActive ? 'text-blue-600 dark:text-blue-400' : tab.color} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{tab.label}</div>
                          <div className="text-xs text-[#171717cc] dark:text-[#fafafacc]">{tab.description}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {isLoading && (
                          <LoaderSpinner size="sm" />
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
      {hasContent && activeTab && (
        <div className="w-full px-4 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg overflow-hidden">
              <div className="p-4">
                {activeTab === "blog" && (
                  <div>
                    {loadingStates.blog && (
                      <div className="text-center py-8">
                        <LoaderSpinner size="xl" className="mb-4" />
                        <p className="text-[#171717cc] dark:text-[#fafafacc] text-base">Generating blog post...</p>
                      </div>
                    )}
                    {errors.blog && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <p className="text-red-700 dark:text-red-400">{errors.blog}</p>
                      </div>
                    )}
                    {!loadingStates.blog && !errors.blog && <BlogView blog={blog} />}
                  </div>
                )}
                {activeTab === "slides" && (
                  <div>
                    {loadingStates.slides && (
                      <div className="text-center py-8">
                        <LoaderSpinner size="xl" className="mb-4" />
                        <p className="text-[#171717cc] dark:text-[#fafafacc] text-base">Generating slides...</p>
                      </div>
                    )}
                    {errors.slides && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <p className="text-red-700 dark:text-red-400">{errors.slides}</p>
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
                      <div className="text-center py-8">
                        <LoaderSpinner size="xl" className="mb-4" />
                        <p className="text-[#171717cc] dark:text-[#fafafacc] text-base">Generating flashcards...</p>
                      </div>
                    )}
                    {errors.flashcards && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <p className="text-red-700 dark:text-red-400">{errors.flashcards}</p>
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
                      <div className="text-center py-8">
                        <LoaderSpinner size="xl" className="mb-4" />
                        <p className="text-[#171717cc] dark:text-[#fafafacc] text-base">Generating quiz...</p>
                      </div>
                    )}
                    {errors.quiz && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <p className="text-red-700 dark:text-red-400">{errors.quiz}</p>
                      </div>
                    )}
                    {!loadingStates.quiz && !errors.quiz && <QuizView quiz={quiz} quizId={currentSessionContent.quiz?.metadata?.contentId} />}
                  </div>
                )}
                {activeTab === "summary" && (
                  <div>
                    {loadingStates.summary && (
                      <div className="text-center py-8">
                        <LoaderSpinner size="xl" className="mb-4" />
                        <p className="text-[#171717cc] dark:text-[#fafafacc] text-base">Generating summary...</p>
                      </div>
                    )}
                    {errors.summary && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <p className="text-red-700 dark:text-red-400">{errors.summary}</p>
                      </div>
                    )}
                    {!loadingStates.summary && !errors.summary && <SummaryView summary={summary} />}
                  </div>
                )}
                {activeTab === "chat" && (
                  <div className="h-[600px]">
                    <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg overflow-hidden h-full flex flex-col border border-gray-200 dark:border-[#fafafa1a]">
                      <div className="p-4 border-b border-gray-200 dark:border-[#fafafa1a] flex justify-between items-center bg-[#171717] dark:bg-[#1E1E1E] text-[#fafafa] dark:text-[#fafafacc]">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-base">EduExtract Assistant</h3>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-xs text-green-300">Context Active</span>
                          </div>
                        </div>
                      </div>
                      
                      <EmbeddedChat />
                    </div>
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
      
      <FileUploadModal
        isOpen={showFileUploadModal}
        onClose={() => {
          setShowFileUploadModal(false);
          setUploadMode("youtube");
        }}
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        isLoading={isLoading}
        isExtractingContent={isExtractingContent}
        onGenerate={async () => {
          if (!user) {
            toggleAuthModal(true);
            return;
          }
          
          setIsLoading(true);
          setError("");
          
          try {
            await processFileContent();
            setShowFileUploadModal(false);
          } catch (err) {
            setError(err.response?.data?.error || "Failed to process file");
            setIsLoading(false);
          }
        }}
        dragActive={dragActive}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      />
      
      {/* Playlist Processing Progress Modal */}
      {playlistProcessing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg max-w-md w-full p-4 border border-gray-200 dark:border-[#fafafa1a]">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#171717] dark:text-[#fafafa]">
                  Processing Playlist
                </h3>
                <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                  Generating {playlistContentType}
                </p>
              </div>
            </div>

            {/* Progress Info */}
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">
                    Fetching transcripts...
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(playlistProgress.percentage)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-[#1E1E1E] rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-1"
                    style={{ width: `${playlistProgress.percentage}%` }}
                  >
                    {playlistProgress.percentage > 10 && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Video Count */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1E1E1E] rounded-lg">
                <span className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                  Videos processed
                </span>
                <span className="text-sm font-bold text-[#171717] dark:text-[#fafafa]">
                  {playlistProgress.current} / {playlistProgress.total}
                </span>
              </div>

              {/* Status Message */}
              <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-600">
                <LoaderSpinner size="md" className="mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 dark:text-blue-300 font-medium">
                    {playlistProgress.current === 0 ? 'Starting...' :
                     playlistProgress.current === playlistProgress.total ? 'Generating content...' :
                     `Processing video ${playlistProgress.current + 1}...`}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                    Please wait, this may take a few minutes
                  </p>
                </div>
              </div>

              {/* Estimated Time */}
              {playlistProgress.total > 0 && (
                <div className="text-center pt-2">
                  <p className="text-xs text-[#171717cc] dark:text-[#fafafacc]">
                    Estimated time: ~{Math.ceil(playlistProgress.total * 5 / 60)} minutes
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <ChatBot isOpen={chatOpen} setIsOpen={setChatOpen} />
    </div>
  );
}

export default Dashboard;