import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import sectionImage from "../assets/section_image.jpg";
import { Github, ArrowRight, Sparkles, Zap, Brain, BookOpen, Users, Star, ChevronDown, Play, CheckCircle, Rocket, Target, Lightbulb, MessageSquare, Chrome, MousePointer, Video, FileText, Download, ExternalLink, Puzzle, Bell, HelpCircle, X, Mic } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../components/Header";
import FeedbackForm from "../components/FeedbackForm";
import { useAuth } from "../context/FirebaseAuthContext";

// Typewriter Text Component
const TypewriterText = ({ text, delay = 0, speed = 30 }) => {
  const [displayText, setDisplayText] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [started, text, speed]);

  return (
    <span>
      {displayText}
      {started && displayText.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-4 bg-current ml-0.5"
        />
      )}
    </span>
  );
};

// Typing Indicator Component
const TypingIndicator = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 bg-orange-400 rounded-full"
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
};

// Animated Counter Component
const AnimatedCounter = ({ target }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <motion.div 
      className="text-3xl font-bold text-white mb-1"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 1.5 }}
    >
      {count}
    </motion.div>
  );
};

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const { scrollY } = useScroll();
  const navigate = useNavigate();
  const { user } = useAuth();
  const featuresRef = useRef(null);

  // Interpolate scroll to transform values
  const rotateX = useTransform(scrollY, [0, 300], [5, 0]);
  const scale = useTransform(scrollY, [0, 300], [0.795, 1]);
  const opacity = useTransform(scrollY, [0, 200], [1, 0.8]);

  const containerRef = useRef(null);
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "start center"],
  });

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const scale1 = useTransform(scrollYProgress, [0, 1], [0.5, 1]);
  const heroY = useTransform(heroProgress, [0, 1], [0, -50]);

  // Testimonials data
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Computer Science Student",
      content: "EduExtract transformed my study routine. I can now understand complex algorithms in minutes instead of hours!",
      avatar: "SC"
    },
    {
      name: "Michael Rodriguez",
      role: "Business Analyst",
      content: "The AI tutor feature is incredible. It's like having a personal tutor available 24/7.",
      avatar: "MR"
    },
    {
      name: "Emily Johnson",
      role: "Medical Student",
      content: "Creating flashcards from my textbooks has never been easier. My exam scores improved by 30%!",
      avatar: "EJ"
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="bg-white dark:bg-[#121212] min-h-screen overflow-x-hidden transition-colors duration-300">
      {/* Navigation */}
      <Header />

      {/* Hero Section */}
      <motion.section 
        ref={heroRef}
        className="relative pt-20 sm:pt-24 md:pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
        style={{ y: heroY }}
      >
        {/* Background Elements */}
        <div className="absolute inset-0 ">
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-gray-200/30 to-gray-300/30 dark:from-gray-700/30 dark:to-gray-600/30 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-gray-100/30 to-gray-200/30 dark:from-gray-800/30 dark:to-gray-700/30 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>

        <div className="relative text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-white/80 dark:bg-[#171717]/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 mb-8"
          >
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-[#fafafacc]">AI-Powered Learning Platform</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#171717] dark:text-[#fafafacc] mb-6 leading-tight"
          >
            Transform Learning with
            <br />
            <span className="text-[#171717cc] dark:text-[#fafafacc]">
              AI Intelligence
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg sm:text-xl md:text-2xl text-[#171717cc] dark:text-[#fafafacc] max-w-4xl mx-auto mb-10 leading-relaxed"
          >
            Turn any content into interactive learning experiences. Generate summaries, 
            create quizzes, build flashcards, and chat with your personal AI tutor.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row justify-center gap-4 mb-12"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/dashboard")}
              className="group bg-[#171717] hover:bg-[#121212] text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Rocket className="w-5 h-5" />
              Start Learning Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowTutorial(true)}
              className="group bg-white dark:bg-[#171717] border border-[#EEEEEE] dark:border-gray-700 text-[#171717cc] dark:text-[#fafafacc] px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#FAFAFA] dark:hover:bg-[#2E2E2E] transition-all duration-300 flex items-center justify-center gap-2"
            >
              <HelpCircle className="w-5 h-5" />
              How to Use
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-16"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["SC", "MR", "EJ", "AL"].map((initials, index) => (
                  <motion.div
                    key={initials}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 + index * 0.1 }}
                    className="w-10 h-10 rounded-full bg-[#171717] border-2 border-white flex items-center justify-center text-sm font-semibold text-white shadow-lg"
                  >
                    {initials}
                  </motion.div>
                ))}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafacc]">1M+ Active Learners</p>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                  <span className="text-sm text-[#171717cc] dark:text-[#fafafacc] ml-1">4.9/5 rating</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Scroll to explore</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ChevronDown className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" />
            </motion.div>
          </motion.div>
        </div>

        {/* Animated Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-16 max-w-5xl mx-auto relative"
        >
          {/* Floating Particles Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  x: [0, Math.random() * 20 - 10, 0],
                  opacity: [0.2, 0.8, 0.2],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          {/* Glow Effects */}
          <motion.div
            className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl"
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.02, 1],
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />

          <motion.div
            className="relative bg-[#171717] rounded-2xl overflow-hidden shadow-2xl border border-gray-800"
            style={{
              perspective: "1200px",
              scale: scale,
              rotateX: rotateX,
              transformStyle: "preserve-3d",
            }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            {/* Animated Border Gradient */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)",
                backgroundSize: "300% 100%",
                padding: "1px",
              }}
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />

            {/* Browser Chrome */}
            <div className="relative bg-[#1a1a1a] px-4 py-3 flex items-center gap-3 border-b border-gray-800">
              <div className="flex gap-2">
                <motion.div 
                  className="w-3 h-3 rounded-full bg-red-500"
                  whileHover={{ scale: 1.3 }}
                  animate={{ boxShadow: ["0 0 0px #ef4444", "0 0 8px #ef4444", "0 0 0px #ef4444"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div 
                  className="w-3 h-3 rounded-full bg-yellow-500"
                  whileHover={{ scale: 1.3 }}
                  animate={{ boxShadow: ["0 0 0px #eab308", "0 0 8px #eab308", "0 0 0px #eab308"] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                />
                <motion.div 
                  className="w-3 h-3 rounded-full bg-green-500"
                  whileHover={{ scale: 1.3 }}
                  animate={{ boxShadow: ["0 0 0px #22c55e", "0 0 8px #22c55e", "0 0 0px #22c55e"] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                />
              </div>
              <motion.div 
                className="flex-1 bg-[#2a2a2a] rounded-lg px-4 py-1.5 text-sm text-gray-400 flex items-center gap-2 overflow-hidden"
                animate={{ borderColor: ["#374151", "#6366f1", "#374151"] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ border: "1px solid #374151" }}
              >
                <motion.div 
                  className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-purple-500"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  eduextract.app/dashboard
                </motion.span>
                <motion.div
                  className="ml-auto flex items-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-green-500">Secure</span>
                </motion.div>
              </motion.div>
            </div>

            {/* Dashboard Content */}
            <div className="relative p-6 min-h-[450px] bg-[#121212]">
              {/* Scan Line Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent h-20 pointer-events-none"
                animate={{ y: [-80, 500] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />

              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      boxShadow: [
                        "0 0 20px rgba(59, 130, 246, 0.3)",
                        "0 0 30px rgba(139, 92, 246, 0.5)",
                        "0 0 20px rgba(59, 130, 246, 0.3)"
                      ]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <BookOpen className="w-5 h-5 text-white" />
                  </motion.div>
                  <div>
                    <motion.h3 
                      className="text-white font-semibold"
                      animate={{ opacity: [1, 0.8, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      EduExtract
                    </motion.h3>
                    <p className="text-gray-500 text-xs">AI Learning Platform</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="relative w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Bell className="w-4 h-4 text-gray-400" />
                    <motion.div
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      3
                    </motion.div>
                  </motion.div>
                  <motion.div 
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-blue-500/30"
                    animate={{ 
                      ring: ["2px solid rgba(59, 130, 246, 0.3)", "2px solid rgba(139, 92, 246, 0.5)", "2px solid rgba(59, 130, 246, 0.3)"]
                    }}
                    whileHover={{ scale: 1.1 }}
                  >
                    JD
                  </motion.div>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Input Section */}
                <motion.div 
                  className="col-span-2 bg-[#1a1a1a] rounded-xl p-4 border border-gray-800"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      <FileText className="w-4 h-4 text-blue-400" />
                    </motion.div>
                    <span className="text-gray-400 text-sm">Content Source</span>
                    <motion.span 
                      className="ml-auto text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full"
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Ready
                    </motion.span>
                  </div>
                  
                  {/* Animated URL Input with Typing Effect */}
                  <motion.div 
                    className="bg-[#252525] rounded-lg p-3 border border-gray-700 mb-3 overflow-hidden relative"
                    animate={{ 
                      borderColor: ["#374151", "#3b82f6", "#8b5cf6", "#374151"],
                      boxShadow: ["0 0 0px #3b82f6", "0 0 15px rgba(59, 130, 246, 0.3)", "0 0 0px #3b82f6"]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <div className="flex items-center gap-2 text-gray-300 text-sm">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Play className="w-4 h-4 text-red-500" />
                      </motion.div>
                      <TypewriterText text="youtube.com/watch?v=AI_Learning_2024" />
                    </div>
                    {/* Progress indicator */}
                    <motion.div
                      className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, delay: 2, repeat: Infinity, repeatDelay: 3 }}
                    />
                  </motion.div>
                  
                  <div className="flex gap-2">
                    <motion.div 
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer shadow-lg"
                      animate={{ 
                        scale: [1, 1.02, 1],
                        boxShadow: [
                          "0 4px 15px rgba(59, 130, 246, 0.3)",
                          "0 4px 25px rgba(139, 92, 246, 0.5)",
                          "0 4px 15px rgba(59, 130, 246, 0.3)"
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap className="w-3 h-3" />
                      </motion.div>
                      Generate Content
                    </motion.div>
                    <motion.div 
                      className="px-4 py-2 bg-[#252525] text-gray-400 rounded-lg text-xs flex items-center gap-2 cursor-pointer border border-gray-700"
                      whileHover={{ borderColor: "#6366f1", color: "#fff" }}
                    >
                      <FileText className="w-3 h-3" /> Upload PDF
                    </motion.div>
                    <motion.div 
                      className="px-4 py-2 bg-[#252525] text-gray-400 rounded-lg text-xs flex items-center gap-2 cursor-pointer border border-gray-700"
                      whileHover={{ borderColor: "#6366f1", color: "#fff" }}
                    >
                      <Video className="w-3 h-3" /> Paste URL
                    </motion.div>
                  </div>
                </motion.div>

                {/* Stats Card with Animated Counter */}
                <motion.div 
                  className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800 relative overflow-hidden"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.4 }}
                >
                  {/* Animated background gradient */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-xs">This Week</span>
                      <motion.span 
                        className="text-xs text-green-400 flex items-center gap-1"
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <ArrowRight className="w-3 h-3 rotate-[-45deg]" />
                        +24%
                      </motion.span>
                    </div>
                    <AnimatedCounter target={127} />
                    <div className="text-gray-500 text-xs">Content Generated</div>
                    
                    {/* Animated Chart */}
                    <div className="mt-3 flex gap-1 items-end h-12">
                      {[40, 60, 45, 80, 55, 70, 95].map((h, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-blue-600 to-purple-500 rounded-sm relative"
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ 
                            duration: 0.8, 
                            delay: 1.5 + i * 0.1,
                            ease: "easeOut"
                          }}
                          whileHover={{ scale: 1.1 }}
                        >
                          <motion.div
                            className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full opacity-0"
                            whileHover={{ opacity: 1 }}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Generated Content Cards with Staggered Animations */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: BookOpen, label: "Summary", sublabel: "AI Generated", color: "from-blue-600 to-blue-400", count: "3 pages", delay: 0 },
                  { icon: Target, label: "Quiz", sublabel: "20 Questions", color: "from-emerald-600 to-emerald-400", count: "Ready", delay: 0.15 },
                  { icon: Zap, label: "Flashcards", sublabel: "Study Mode", color: "from-violet-600 to-violet-400", count: "45 cards", delay: 0.3 },
                  { icon: Brain, label: "AI Chat", sublabel: "Ask Anything", color: "from-orange-600 to-orange-400", count: "Online", delay: 0.45 },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800 cursor-pointer relative overflow-hidden group"
                    initial={{ opacity: 0, y: 30, rotateX: -15 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ duration: 0.6, delay: 1.8 + item.delay }}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -5,
                      borderColor: "#6366f1"
                    }}
                  >
                    {/* Hover glow effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300"
                    />
                    
                    <motion.div 
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 shadow-lg relative`}
                      animate={{ 
                        rotate: [0, 5, -5, 0],
                        boxShadow: [
                          "0 4px 15px rgba(0,0,0,0.2)",
                          "0 8px 25px rgba(0,0,0,0.3)",
                          "0 4px 15px rgba(0,0,0,0.2)"
                        ]
                      }}
                      transition={{ duration: 4, repeat: Infinity, delay: index * 0.5 }}
                    >
                      <item.icon className="w-6 h-6 text-white" />
                      {/* Pulse ring */}
                      <motion.div
                        className={`absolute inset-0 rounded-xl bg-gradient-to-br ${item.color} opacity-50`}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                      />
                    </motion.div>
                    
                    <div className="relative">
                      <div className="text-white text-sm font-semibold">{item.label}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{item.sublabel}</div>
                      <motion.div 
                        className="text-xs mt-2 px-2 py-1 bg-gray-800 rounded-full text-gray-300 inline-block"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                      >
                        {item.count}
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Floating AI Chat Preview - Enhanced */}
              <motion.div
                className="absolute bottom-6 right-6 w-80 bg-[#1a1a1a] rounded-xl shadow-2xl border border-gray-700 overflow-hidden"
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 2.5, type: "spring" }}
              >
                {/* Glowing border effect */}
                <motion.div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ padding: "1px" }}
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(249, 115, 22, 0.2)",
                      "0 0 40px rgba(249, 115, 22, 0.4)",
                      "0 0 20px rgba(249, 115, 22, 0.2)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2.5 flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Brain className="w-4 h-4 text-white" />
                  </motion.div>
                  <span className="text-white text-sm font-medium">AI Tutor</span>
                  <motion.div 
                    className="w-2 h-2 rounded-full bg-white ml-auto"
                    animate={{ 
                      opacity: [1, 0.5, 1],
                      boxShadow: ["0 0 5px #fff", "0 0 10px #fff", "0 0 5px #fff"]
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-white/80 text-xs">Online</span>
                </div>
                
                <div className="p-3 space-y-3 bg-[#1a1a1a]">
                  {/* User message */}
                  <motion.div 
                    className="bg-[#252525] rounded-lg p-2.5 text-gray-300 text-xs max-w-[85%]"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2.8 }}
                  >
                    What are the key concepts in this video?
                  </motion.div>
                  
                  {/* AI Response with typing indicator then response */}
                  <motion.div 
                    className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-lg p-2.5 text-white text-xs max-w-[95%] ml-auto border border-orange-500/30"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 3.2 }}
                  >
                    <TypingIndicator />
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ delay: 4.5, duration: 0.3 }}
                    >
                      <TypewriterText 
                        text="The video covers 3 main concepts: 1) Neural Networks architecture, 2) Backpropagation algorithm, 3) Activation functions. Would you like me to explain any of these in detail?"
                        delay={4.8}
                        speed={20}
                      />
                    </motion.div>
                  </motion.div>
                </div>
                
                <div className="px-3 pb-3 bg-[#1a1a1a]">
                  <motion.div 
                    className="flex items-center gap-2 bg-[#252525] rounded-lg px-3 py-2 border border-gray-700"
                    animate={{ borderColor: ["#374151", "#f97316", "#374151"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <input 
                      type="text" 
                      placeholder="Ask anything about the content..." 
                      className="flex-1 bg-transparent text-xs text-gray-400 outline-none"
                      disabled
                    />
                    <motion.button
                      className="p-1.5 bg-orange-500 rounded-lg"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      whileHover={{ scale: 1.2 }}
                    >
                      <ArrowRight className="w-3 h-3 text-white" />
                    </motion.button>
                  </motion.div>
                </div>
              </motion.div>

              {/* Floating notification */}
              <motion.div
                className="absolute top-4 right-4 bg-green-500/20 border border-green-500/50 rounded-lg px-3 py-2 flex items-center gap-2"
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 3, type: "spring" }}
              >
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-400 text-xs font-medium">Content processed successfully!</span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        ref={containerRef}
        className="py-20 bg-[#F3F4F6] dark:bg-[#0A0A0A]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-[#EEEEEE] dark:bg-[#171717] rounded-full px-4 py-2 mb-6"
            >
              <Zap className="w-4 h-4 text-[#171717] dark:text-[#fafafacc]" />
              <span className="text-sm font-semibold text-[#171717] dark:text-[#fafafacc]">Powerful Features</span>
            </motion.div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#171717] dark:text-[#fafafacc] mb-6">
              Everything you need to
              <br />
              <span className="text-[#171717cc] dark:text-[#fafafacc]">
                master any subject
              </span>
            </h2>
            
            <p className="text-lg text-[#171717cc] dark:text-[#fafafacc] max-w-3xl mx-auto">
              Our AI-powered platform transforms any learning material into interactive, 
              personalized experiences that adapt to your learning style.
            </p>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: BookOpen,
                title: "Smart Summaries",
                description: "Generate concise, comprehensive summaries from any content in seconds.",
                color: "bg-[#171717]",
                bgColor: "bg-white"
              },
              {
                icon: Target,
                title: "Interactive Quizzes",
                description: "Create personalized quizzes with instant feedback and progress tracking.",
                color: "bg-[#171717]",
                bgColor: "bg-white"
              },
              {
                icon: Brain,
                title: "AI Tutor Chat",
                description: "Get instant answers and explanations from your personal AI tutor.",
                color: "bg-[#171717]",
                bgColor: "bg-white"
              },
              {
                icon: Zap,
                title: "Flashcard Generator",
                description: "Automatically create flashcards for efficient memorization.",
                color: "bg-[#171717]",
                bgColor: "bg-white"
              },
              {
                icon: Users,
                title: "Collaboration Hub",
                description: "Share and collaborate on learning materials with peers.",
                color: "bg-[#171717]",
                bgColor: "bg-white"
              },
              {
                icon: Lightbulb,
                title: "Smart Insights",
                description: "Get personalized learning recommendations and insights.",
                color: "bg-[#171717]",
                bgColor: "bg-white"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative"
              >
                <div className={`${feature.bgColor} dark:bg-[#171717] p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#EEEEEE] dark:border-gray-700`}>
                  <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-[#171717] dark:text-[#fafafacc] mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-[#171717cc] dark:text-[#fafafacc] leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <motion.div
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    initial={{ scale: 0 }}
                    whileHover={{ scale: 1 }}
                  >
                    <ArrowRight className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Chrome Extension Section */}
      <motion.section
        ref={featuresRef}
        className="py-20 bg-white dark:bg-[#121212] overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-[#EEEEEE] dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 mb-6"
              >
                <Chrome className="w-4 h-4 text-[#171717] dark:text-[#fafafacc]" />
                <span className="text-sm font-semibold text-[#171717] dark:text-[#fafafacc]">Chrome Extension</span>
              </motion.div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#171717] dark:text-[#fafafacc] mb-6 leading-tight">
                Learn directly from
                <br />
                <span className="text-[#171717cc] dark:text-[#fafafacc]">
                  YouTube videos
                </span>
              </h2>

              <p className="text-lg text-[#171717cc] dark:text-[#fafafacc] mb-8 leading-relaxed">
                Install our Chrome extension and transform any YouTube video into comprehensive study materials 
                with just one click. No more switching between tabs!
              </p>

              {/* Extension Features List */}
              <div className="space-y-4 mb-8">
                {[
                  { icon: Video, text: "One-click generation from any YouTube video" },
                  { icon: MousePointer, text: "Right-click context menu for quick actions" },
                  { icon: Zap, text: "Instant summaries, quizzes & flashcards" },
                  { icon: Puzzle, text: "Seamless integration with your dashboard" },
                ].map((item, index) => (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-[#171717] dark:bg-[#fafafa] rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-white dark:text-[#171717]" />
                    </div>
                    <span className="text-[#171717cc] dark:text-[#fafafacc] font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.a
                  href="https://chrome.google.com/webstore"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group bg-[#171717] dark:bg-[#fafafa] hover:bg-[#2E2E2E] dark:hover:bg-[#E5E7EB] text-white dark:text-[#171717] px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Chrome className="w-5 h-5" />
                  Add to Chrome
                  <span className="text-xs bg-white/20 dark:bg-black/10 px-2 py-0.5 rounded-full">Free</span>
                </motion.a>
                
                <motion.a
                  href="https://github.com/fypdeveloperss/eduExtract/tree/main/chrome-extension"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 text-[#171717cc] dark:text-[#fafafacc] px-6 py-3 rounded-full font-semibold hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Github className="w-5 h-5" />
                  View Source
                  <ExternalLink className="w-4 h-4 opacity-50" />
                </motion.a>
              </div>
            </motion.div>

            {/* Right - Browser Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Browser Window */}
              <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Browser Header */}
                <div className="bg-gray-200 dark:bg-gray-800 px-4 py-3 flex items-center gap-3 border-b border-gray-300 dark:border-gray-700">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 bg-white dark:bg-gray-700 rounded-lg px-4 py-1.5 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    youtube.com/watch?v=...
                  </div>
                  {/* Extension Icon */}
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-8 h-8 bg-[#171717] dark:bg-[#fafafa] rounded-lg flex items-center justify-center cursor-pointer shadow-lg"
                  >
                    <span className="text-white dark:text-[#171717] text-xs font-bold">EE</span>
                  </motion.div>
                </div>

                {/* YouTube Video Mockup */}
                <div className="relative aspect-video bg-gray-900">
                  {/* Fake Video Player */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <Play className="w-10 h-10 text-white ml-1" fill="white" />
                      </div>
                      <p className="text-white font-medium">Introduction to Machine Learning</p>
                      <p className="text-gray-400 text-sm mt-1">45:32 • 1.2M views</p>
                    </div>
                  </div>

                  {/* EduExtract Button Overlay */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    viewport={{ once: true }}
                    className="absolute bottom-4 right-4"
                  >
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate with EduExtract
                    </motion.div>
                  </motion.div>
                </div>

                {/* Extension Popup Preview */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1 }}
                  viewport={{ once: true }}
                  className="absolute top-16 right-4 w-72 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Popup Header */}
                  <div className="bg-[#171717] dark:bg-[#fafafa] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/20 dark:bg-black/10 rounded-lg flex items-center justify-center">
                        <span className="text-white dark:text-[#171717] text-sm font-bold">EE</span>
                      </div>
                      <div>
                        <h4 className="text-white dark:text-[#171717] font-semibold text-sm">EduExtract</h4>
                        <p className="text-white/70 dark:text-[#171717]/70 text-xs">AI Learning Assistant</p>
                      </div>
                    </div>
                  </div>

                  {/* Video Detected */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">YouTube Video Detected</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      Introduction to Machine Learning
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">Quick Actions</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: FileText, label: "Summary", color: "bg-[#171717] dark:bg-[#2E2E2E]" },
                        { icon: Target, label: "Quiz", color: "bg-[#171717] dark:bg-[#2E2E2E]" },
                        { icon: Zap, label: "Cards", color: "bg-[#171717] dark:bg-[#2E2E2E]" },
                      ].map((action) => (
                        <motion.div
                          key={action.label}
                          whileHover={{ scale: 1.05 }}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center`}>
                            <action.icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-300">{action.label}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Decorative Elements */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-gray-200/30 to-gray-300/30 dark:from-gray-700/30 dark:to-gray-600/30 rounded-full blur-2xl"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-gray-100/30 to-gray-200/30 dark:from-gray-800/30 dark:to-gray-700/30 rounded-full blur-2xl"
              />
            </motion.div>
          </div>

          {/* Extension Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {[
              { value: "10K+", label: "Active Users", icon: Users },
              { value: "50K+", label: "Videos Processed", icon: Video },
              { value: "4.8", label: "Chrome Store Rating", icon: Star },
              { value: "100%", label: "Free Forever", icon: CheckCircle },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-6 bg-[#F3F4F6] dark:bg-[#0A0A0A] rounded-xl border border-gray-200 dark:border-gray-800"
              >
                <stat.icon className="w-6 h-6 text-[#171717] dark:text-[#fafafacc] mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-bold text-[#171717] dark:text-[#fafafacc]">{stat.value}</div>
                <div className="text-sm text-[#171717cc] dark:text-[#fafafacc]">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Testimonials Section */}
      <motion.section
        className="py-20 bg-[#F3F4F6] dark:bg-[#0A0A0A]"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#171717] dark:text-[#fafafacc] mb-6">
              Loved by learners worldwide
            </h2>
            <p className="text-lg text-[#171717cc] dark:text-[#fafafacc] max-w-3xl mx-auto">
              Join millions of students who have transformed their learning experience with EduExtract.
            </p>
          </motion.div>

          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-[#171717] rounded-2xl p-8 shadow-xl max-w-4xl mx-auto border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-[#171717] rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {testimonials[currentTestimonial].avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#171717] dark:text-[#fafafacc]">{testimonials[currentTestimonial].name}</h4>
                    <p className="text-[#171717cc] dark:text-[#fafafacc]">{testimonials[currentTestimonial].role}</p>
                  </div>
                </div>
                
                <blockquote className="text-lg text-[#171717cc] dark:text-[#fafafacc] leading-relaxed">
                  "{testimonials[currentTestimonial].content}"
                </blockquote>
                
                <div className="flex items-center justify-center gap-1 mt-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Testimonial Indicators */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentTestimonial 
                      ? 'bg-[#171717] dark:bg-[#fafafacc] scale-125' 
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="py-20 bg-[#171717]"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to transform your learning?
            </h2>
            
            <p className="text-xl text-white mb-10 max-w-2xl mx-auto">
              Join millions of learners who are already using AI to master new subjects faster and more effectively.
            </p>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/dashboard")}
              className="bg-white dark:bg-gray-100 text-[#171717] dark:text-gray-900 px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 mx-auto"
            >
              <Rocket className="w-6 h-6" />
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            
            <p className="text-white text-sm mt-4">
              No credit card required • Start learning in seconds
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Feedback Section */}
      <motion.section
        className="py-20 bg-[#F3F4F6] dark:bg-[#0A0A0A]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-[#EEEEEE] dark:bg-[#171717] rounded-full px-4 py-2 mb-6">
              <MessageSquare className="w-4 h-4 text-[#171717] dark:text-[#fafafacc]" />
              <span className="text-sm font-medium text-[#171717] dark:text-[#fafafacc]">We Value Your Input</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#171717] dark:text-[#fafafacc] mb-6">
              Help us improve EduExtract
            </h2>
            
            <p className="text-lg text-[#171717cc] dark:text-[#fafafacc] max-w-2xl mx-auto mb-8">
              Your feedback drives our innovation. Share your thoughts, report issues, or suggest new features 
              to help us build the best learning platform for everyone.
            </p>

            {user ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFeedbackForm(true)}
                className="bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 mx-auto"
              >
                <MessageSquare className="w-5 h-5" />
                Share Your Feedback
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            ) : (
              <div className="space-y-4">
                <p className="text-[#171717cc] dark:text-[#fafafacc] text-base">
                  Sign in to share your feedback and help us improve
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/dashboard")}
                  className="bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 mx-auto"
                >
                  <Users className="w-5 h-5" />
                  Sign In to Give Feedback
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            )}
          </motion.div>

          {/* Feedback Stats or Features */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="bg-white dark:bg-[#171717] rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-800">
              <div className="w-12 h-12 bg-[#171717] dark:bg-[#fafafa] rounded-lg flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-white dark:text-[#171717]" />
              </div>
              <h3 className="font-semibold text-[#171717] dark:text-[#fafafacc] mb-2">Feature Requests</h3>
              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                Suggest new features and improvements you'd like to see
              </p>
            </div>

            <div className="bg-white dark:bg-[#171717] rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-800">
              <div className="w-12 h-12 bg-[#171717] dark:bg-[#fafafa] rounded-lg flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-white dark:text-[#171717]" />
              </div>
              <h3 className="font-semibold text-[#171717] dark:text-[#fafafacc] mb-2">Bug Reports</h3>
              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                Help us fix issues and improve the platform's stability
              </p>
            </div>

            <div className="bg-white dark:bg-[#171717] rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-800">
              <div className="w-12 h-12 bg-[#171717] dark:bg-[#fafafa] rounded-lg flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-6 h-6 text-white dark:text-[#171717]" />
              </div>
              <h3 className="font-semibold text-[#171717] dark:text-[#fafafacc] mb-2">General Feedback</h3>
              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                Share your overall experience and thoughts about EduExtract
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-[#121212] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">EduExtract</h3>
              <p className="text-gray-400 mb-6 max-w-md">
                Transform any content into interactive learning experiences with the power of AI.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Github className="w-6 h-6" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 EduExtract Inc. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Feedback Form Modal */}
      <FeedbackForm 
        isOpen={showFeedbackForm} 
        onClose={() => setShowFeedbackForm(false)} 
      />

      {/* How to Use Tutorial Modal */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowTutorial(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white dark:bg-[#171717] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-[#2E2E2E] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#2E2E2E] bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">How to Generate Content</h3>
                    <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Follow these simple steps</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTutorial(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors"
                >
                  <X className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">1</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Go to Dashboard</h4>
                      <p className="text-[#171717cc] dark:text-[#fafafacc] mb-3">
                        Click on "Start Learning Now" or navigate to the Dashboard from the navigation menu. This is your central hub for generating content.
                      </p>
                      <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-3 border border-gray-200 dark:border-[#2E2E2E]">
                        <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] flex items-center gap-2">
                          <Rocket className="w-4 h-4 text-blue-500" />
                          Quick tip: Bookmark the dashboard for easy access!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">2</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Choose Your Source</h4>
                      <p className="text-[#171717cc] dark:text-[#fafafacc] mb-3">
                        Select how you want to provide content:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-3 border border-gray-200 dark:border-[#2E2E2E]">
                          <div className="flex items-center gap-2 mb-1">
                            <Video className="w-4 h-4 text-red-500" />
                            <span className="font-medium text-[#171717] dark:text-[#fafafa]">YouTube URL</span>
                          </div>
                          <p className="text-xs text-[#171717cc] dark:text-[#fafafacc]">Paste any YouTube video link</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-3 border border-gray-200 dark:border-[#2E2E2E]">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-[#171717] dark:text-[#fafafa]">Upload File</span>
                          </div>
                          <p className="text-xs text-[#171717cc] dark:text-[#fafafacc]">PDF, DOCX, or TXT files</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-3 border border-gray-200 dark:border-[#2E2E2E]">
                          <div className="flex items-center gap-2 mb-1">
                            <Mic className="w-4 h-4 text-green-500" />
                            <span className="font-medium text-[#171717] dark:text-[#fafafa]">Record Audio</span>
                          </div>
                          <p className="text-xs text-[#171717cc] dark:text-[#fafafacc]">Record voice or upload audio</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">3</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Select Content Type</h4>
                      <p className="text-[#171717cc] dark:text-[#fafafacc] mb-3">
                        Choose what type of educational content you want to generate:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: "Summary", icon: "📝", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
                          { name: "Blog Post", icon: "📰", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
                          { name: "Flashcards", icon: "🃏", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
                          { name: "Quiz", icon: "❓", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
                          { name: "Slides", icon: "📊", color: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300" },
                          { name: "AI Chat", icon: "💬", color: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300" }
                        ].map((type) => (
                          <span key={type.name} className={`px-3 py-1.5 rounded-full text-sm font-medium ${type.color}`}>
                            {type.icon} {type.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">4</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Generate & Review</h4>
                      <p className="text-[#171717cc] dark:text-[#fafafacc] mb-3">
                        Click the "Generate" button and wait for the AI to process your content. Review the generated material and make any edits if needed.
                      </p>
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Generation typically takes 10-30 seconds depending on content length
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                      <span className="text-lg font-bold text-pink-600 dark:text-pink-400">5</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Save & Access Your Content</h4>
                      <p className="text-[#171717cc] dark:text-[#fafafacc] mb-3">
                        All generated content is automatically saved to "My Content" in your dashboard. You can view, edit, download, or share your materials anytime.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-[#2E2E2E] text-[#171717cc] dark:text-[#fafafacc] flex items-center gap-1">
                          <Download className="w-3 h-3" /> Download
                        </span>
                        <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-[#2E2E2E] text-[#171717cc] dark:text-[#fafafacc] flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Share
                        </span>
                        <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-[#2E2E2E] text-[#171717cc] dark:text-[#fafafacc] flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Edit
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pro Tips Section */}
                <div className="mt-8 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <h4 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Pro Tips
                  </h4>
                  <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Use videos with clear audio for better transcript accuracy</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Longer content generates more comprehensive study materials</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Try generating multiple content types from the same source</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex-shrink-0 flex gap-3 p-5 border-t border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1E1E1E]">
                <button
                  onClick={() => setShowTutorial(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] font-medium hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowTutorial(false);
                    navigate("/dashboard");
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  Start Generating
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
