import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/FirebaseAuthContext";
import ThemeToggle from "./ThemeToggle";
import { ChevronDown, BookOpen, Target, Brain, Zap, Users, MessageCircle, FileText, StickyNote, ListChecks, ShoppingCart, MessageSquare } from "lucide-react";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const featuresRef = useRef(null);

  // Interpolate scroll to transform values
  const containerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    const handleClickOutside = (event) => {
      if (featuresRef.current && !featuresRef.current.contains(event.target)) {
        setIsFeaturesOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Navigation */}
      <nav
        className={`fixed w-full z-50 transition-all duration-300 ${
          isScrolled ? "bg-white dark:bg-[#121212] shadow-md" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <div className="font-bold text-xl sm:text-2xl">
                    <Link className="text-black dark:text-[#fafafacc]" to="/">EduExtract</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:block">
              <div className="ml-10 flex items-center space-x-6 xl:space-x-8">
                <div className="relative" ref={featuresRef}>
                  <button
                    onClick={() => setIsFeaturesOpen(!isFeaturesOpen)}
                    className="text-[#171717cc] dark:text-[#fafafacc] hover:text-gray-900 dark:hover:text-[#fafafacc] relative group px-3 py-2 text-sm xl:text-base flex items-center"
                  >
                    Features
                    <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isFeaturesOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Features Dropdown */}
                  {isFeaturesOpen && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-[#171717] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                      <div className="p-4">
                        <div className="grid grid-cols-1 gap-2">
                          {/* Content Generation */}
                          <div className="mb-3">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-[#fafafacc] uppercase tracking-wide mb-2">Content Generation</h3>
                            <div className="space-y-1">
                              <Link
                                to="/dashboard"
                                onClick={() => setIsFeaturesOpen(false)}
                                className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] rounded-md transition-colors"
                              >
                                <FileText className="w-4 h-4 mr-3 text-blue-500" />
                                Smart Summaries
                              </Link>
                              <Link
                                to="/dashboard"
                                onClick={() => setIsFeaturesOpen(false)}
                                className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] rounded-md transition-colors"
                              >
                                <BookOpen className="w-4 h-4 mr-3 text-green-500" />
                                Blog Posts
                              </Link>
                              <Link
                                to="/dashboard"
                                onClick={() => setIsFeaturesOpen(false)}
                                className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] rounded-md transition-colors"
                              >
                                <StickyNote className="w-4 h-4 mr-3 text-purple-500" />
                                Presentation Slides
                              </Link>
                              <Link
                                to="/dashboard"
                                onClick={() => setIsFeaturesOpen(false)}
                                className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] rounded-md transition-colors"
                              >
                                <MessageCircle className="w-4 h-4 mr-3 text-orange-500" />
                                Flashcards
                              </Link>
                              <Link
                                to="/dashboard"
                                onClick={() => setIsFeaturesOpen(false)}
                                className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] rounded-md transition-colors"
                              >
                                <ListChecks className="w-4 h-4 mr-3 text-red-500" />
                                Interactive Quizzes
                              </Link>
                            </div>
                          </div>
                          
                          {/* Learning Tools */}
                          <div className="mb-3">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-[#fafafacc] uppercase tracking-wide mb-2">Learning Tools</h3>
                            <div className="space-y-1">
                              <Link
                                to="/collaborate"
                                onClick={() => setIsFeaturesOpen(false)}
                                className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] rounded-md transition-colors"
                              >
                                <Users className="w-4 h-4 mr-3 text-indigo-500" />
                                Collaboration Hub
                              </Link>
                              <Link
                                to="/marketplace"
                                onClick={() => setIsFeaturesOpen(false)}
                                className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] rounded-md transition-colors"
                              >
                                <ShoppingCart className="w-4 h-4 mr-3 text-teal-500" />
                                Marketplace
                              </Link>
                              <Link
                                to="/forum"
                                onClick={() => setIsFeaturesOpen(false)}
                                className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] rounded-md transition-colors"
                              >
                                <MessageSquare className="w-4 h-4 mr-3 text-pink-500" />
                                Community Forum
                              </Link>
                              <Link
                                to="/content"
                                onClick={() => setIsFeaturesOpen(false)}
                                className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] rounded-md transition-colors"
                              >
                                <Brain className="w-4 h-4 mr-3 text-yellow-500" />
                                My Content Library
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Link
                  to="/pricing"
                  className="text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc] px-3 py-2 text-sm xl:text-base"
                >
                  Pricing
                </Link>
                <ul className="flex flex-row gap-6 xl:gap-10">
                  <li>
                    <Link
                      to="/about"
                      className="hover:text-[#171717] dark:hover:text-[#fafafacc] text-[#171717cc] dark:text-[#fafafacc] text-sm xl:text-base"
                    >
                      About
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/contact"
                      className="hover:text-[#171717] dark:hover:text-[#fafafacc] text-[#171717cc] dark:text-[#fafafacc] text-sm xl:text-base"
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Desktop Auth Section */}
            <div className="hidden lg:flex items-center gap-3 xl:gap-4">
              <ThemeToggle />
              
              {user ? (
                <div className="flex items-center gap-2 xl:gap-3">
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-xs xl:text-sm font-medium transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    className="bg-[#171717] text-white px-3 xl:px-4 py-2 rounded-md font-medium text-xs xl:text-sm transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-white bg-[#171717] rounded-md hover:bg-[#121212] px-3 xl:px-4 py-2 text-xs xl:text-sm transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="bg-[#171717] text-white px-3 xl:px-4 py-2 rounded-md font-medium text-xs xl:text-sm transition-colors"
                >
                  Get Started
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-md text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500"
                aria-label="Toggle mobile menu"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-[#171717] border-t border-gray-200 dark:border-gray-700">
                {/* Mobile Navigation Links */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-[#fafafacc] uppercase tracking-wide mb-2 px-3">Content Generation</h3>
                  <Link
                    to="/dashboard"
                    className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc]"
                    onClick={closeMobileMenu}
                  >
                    <FileText className="w-4 h-4 mr-3 text-blue-500" />
                    Smart Summaries
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc]"
                    onClick={closeMobileMenu}
                  >
                    <BookOpen className="w-4 h-4 mr-3 text-green-500" />
                    Blog Posts
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc]"
                    onClick={closeMobileMenu}
                  >
                    <StickyNote className="w-4 h-4 mr-3 text-purple-500" />
                    Presentation Slides
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc]"
                    onClick={closeMobileMenu}
                  >
                    <MessageCircle className="w-4 h-4 mr-3 text-orange-500" />
                    Flashcards
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc]"
                    onClick={closeMobileMenu}
                  >
                    <ListChecks className="w-4 h-4 mr-3 text-red-500" />
                    Interactive Quizzes
                  </Link>
                </div>
                
                <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-[#fafafacc] uppercase tracking-wide mb-2 px-3">Learning Tools</h3>
                  <Link
                    to="/collaborate"
                    className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc]"
                    onClick={closeMobileMenu}
                  >
                    <Users className="w-4 h-4 mr-3 text-indigo-500" />
                    Collaboration Hub
                  </Link>
                  <Link
                    to="/marketplace"
                    className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc]"
                    onClick={closeMobileMenu}
                  >
                    <ShoppingCart className="w-4 h-4 mr-3 text-teal-500" />
                    Marketplace
                  </Link>
                  <Link
                    to="/forum"
                    className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc]"
                    onClick={closeMobileMenu}
                  >
                    <MessageSquare className="w-4 h-4 mr-3 text-pink-500" />
                    Community Forum
                  </Link>
                  <Link
                    to="/content"
                    className="flex items-center px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc]"
                    onClick={closeMobileMenu}
                  >
                    <Brain className="w-4 h-4 mr-3 text-yellow-500" />
                    My Content Library
                  </Link>
                </div>
                <Link
                  to="/pricing"
                  className="block px-3 py-2 text-base font-medium text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc]"
                  onClick={closeMobileMenu}
                >
                  Pricing
                </Link>
                <Link
                  to="/about"
                  className="block px-3 py-2 text-base font-medium text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc]"
                  onClick={closeMobileMenu}
                >
                  About
                </Link>
                <Link
                  to="/contact"
                  className="block px-3 py-2 text-base font-medium text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafacc]"
                  onClick={closeMobileMenu}
                >
                  Contact
                </Link>

                {/* Mobile Auth Section */}
                <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
                  {user ? (
                    <div className="space-y-2">
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                          onClick={closeMobileMenu}
                        >
                          Admin
                        </Link>
                      )}
                      <Link
                        to="/dashboard"
                        className="block w-full text-center bg-[#171717] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        onClick={closeMobileMenu}
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          closeMobileMenu();
                        }}
                        className="block w-full text-center bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        navigate("/dashboard");
                        closeMobileMenu();
                      }}
                      className="block w-full text-center bg-[#171717] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Get Started
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};
export default Header;
