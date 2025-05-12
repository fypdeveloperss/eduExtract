import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import demoVideo from "../assets/banner.mp4";
import sectionImage from "../assets/section_image.jpg";
import { Github } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const navigate = useNavigate();

  // Interpolate scroll to transform values
  const rotateX = useTransform(scrollY, [0, 300], [5, 0]); // rotateX from 5° to 0°
  const scale = useTransform(scrollY, [0, 300], [0.795, 1]); // scale from ~0.895 to 1

  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "start center"], // Triggers animation as section enters viewport
  });

  const scale1 = useTransform(scrollYProgress, [0, 1], [0.5, 1]);

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

  return (
    <div className="bg-white min-h-screen">
      {/* Navigation */}
      <nav
        className={`fixed w-full z-50 transition-all duration-300 ${
          isScrolled ? "bg-white shadow-md" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <div className="text-black font-bold text-2xl">
                    EduExtract
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-8">
                <a
                  href="#"
                  className="text-gray-700 hover:text-gray-900 relative group px-3 py-2"
                >
                  Features
                  <span className="inline-block ml-1">▼</span>
                </a>
                <a
                  href="#"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2"
                >
                  Pricing
                </a>
                <a
                  href="#"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2"
                >
                  Careers
                </a>
              </div>
            </div>
            <div>
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-black text-white px-4 py-2 rounded-md font-medium"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            An AI tutor made for you
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Turn your learning materials into concise notes, quizzes,
            interactive chats, and more
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-md font-medium">
              See features
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-black text-white px-6 py-3 rounded-md font-medium"
            >
              Get Started
            </button>
          </div>
          <div className="mt-8 flex items-center justify-center">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white">
                H
              </div>
              <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-white">
                S
              </div>
              <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-white">
                S
              </div>
              <div className="w-8 h-8 rounded-full bg-teal-500 border-2 border-white">
                E
              </div>
            </div>
            <p className="ml-3 text-sm text-gray-600">
              Loved by over 1 million learners
            </p>
          </div>
        </div>

        {/* Tilting Demo Image/Video */}
        <div className="mt-16 max-w-full mx-auto">
          <motion.div
            className="relative bg-gray-900 rounded-lg overflow-hidden shadow-xl"
            style={{
              perspective: "1200px",
              scale: scale,
              rotateX: rotateX,
              transformStyle: "preserve-3d",
            }}
          >
            <video
              src={demoVideo}
              autoPlay
              muted
              loop
              playsInline
              className="w-full"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>

            <div className="absolute top-0 left-0 right-0 p-4 flex items-center">
              <div className="flex space-x-4 text-white text-sm">
                <div className="px-3 py-1 bg-gray-800/80 rounded">PDF</div>
                <div className="px-3 py-1 bg-gray-800/80 rounded-md flex items-center">
                  Chapters <span className="ml-2">▼</span>
                </div>
              </div>
              <div className="ml-auto">
                <div className="px-3 py-1 bg-gray-800/80 rounded">Chat</div>
              </div>
            </div>

            <div className="absolute bottom-0 right-0 p-4">
              <div className="px-4 py-2 bg-gray-800/80 rounded-md text-white">
                What is the principle regarding...
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Hero Section */}
      <div
        className="mt-16 max-w-6xl mx-auto overflow-hidden"
        ref={containerRef}
      >
        <div className="bg-gray-100 rounded-xl p-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start gap-10">
            <div className="w-full md:w-1/3">
              {/* Text Section */}
              <div className="flex items-center mb-4">
                <div className="bg-black text-white p-2 rounded-md mr-2">
                  {/* Icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-0.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-black">
                  Summary, flashcards, quizzes, voice mode, and more
                </h2>
              </div>
              <p className="text-gray-700">
                Understand the key points, test your knowledge, get answers with
                references, and talk with an AI tutor.
              </p>
            </div>

            {/* Image Section with scaling motion */}
            <div className="w-full md:w-2/3">
              <motion.div
                className="relative bg-black rounded-lg overflow-hidden shadow-xl"
                style={{ scale1 }}
              >
                <img
                  src={sectionImage}
                  alt="EduExtract platform demo - Philosophy lecture"
                  className="w-full"
                />

                {/* UI Overlay Elements */}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Cards Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="black"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="black"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-center mb-4">
                Upload any content
              </h3>
              <p className="text-gray-600 text-center">
                From PDFs and YouTube videos to slides and even recorded
                lectures, learn everything your way.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="black"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-center mb-4">
                Test your knowledge
              </h3>
              <p className="text-gray-600 text-center">
                Create personalized exams, get answer breakdowns, and track your
                progress.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="black"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-center mb-4">
                Talk with an AI Tutor
              </h3>
              <p className="text-gray-600 text-center">
                Talk to an AI tutor to simplify ideas and receive guidance on
                the content.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 bg-white">
        {/* Main Content */}
        <main className="flex-grow flex items-center justify-center px-4">
          <div className="w-full max-w-[80%] mx-2 rounded-3xl bg-gray-100 py-24 px-6 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Learn smarter, faster, easier.
            </h1>
            <p className="text-gray-600 mb-8">
              Upload your content, and start your learning journey.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-black hover:bg-gray-800 text-white font-medium py-3 px-8 rounded-full"
            >
              Get Started
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-4 border-t border-gray-200">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
            <div>
              <p>© Copyright 2025 YouLearn Inc.</p>
            </div>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-gray-900">
                Blogs
              </a>
              <a href="#" className="hover:text-gray-900">
                Invite & Earn
              </a>
              <a href="#" className="hover:text-gray-900">
                Careers
              </a>
              <a href="#" className="hover:text-gray-900">
                Terms & Conditions
              </a>
              <a href="#" className="hover:text-gray-900">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-gray-900">
                Contact Us
              </a>
              <a href="#" className="hover:text-gray-900">
                <Github size={20} className="text-gray-800" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
