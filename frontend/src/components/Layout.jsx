import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import AuthModal from "./AuthModal";
import UserModal from "./UserModal";
import SettingsModal from "./SettingsModal";
import PageLoader from "./PageLoader";
import { useAuth } from "../context/FirebaseAuthContext";

// Add CSS keyframes for fadeIn and slideInFromBottom animations
const fadeInKeyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideInFromBottom {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.6s ease-out forwards;
  }
  
  .animate-slideInFromBottom {
    animation: slideInFromBottom 0.2s ease-out forwards;
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = fadeInKeyframes;
  document.head.appendChild(style);
}

const Layout = () => {
  const { user, logout, toggleAuthModal } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);

  // Auto-collapse sidebar on mobile screens
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Page loading effect
  useEffect(() => {
    setIsPageLoading(true);
    
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 1000); // 1 second loader

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserDropdownOpen) {
        const dropdown = document.querySelector('[data-dropdown="user-menu"]');
        if (dropdown && !dropdown.contains(event.target)) {
          setIsUserDropdownOpen(false);
        }
      }
    };

    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserDropdownOpen]);

  return (
    <div className="relative min-h-screen">
      {/* Mobile Overlay */}
      {!sidebarCollapsed && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? (isMobile ? 'w-0 p-0' : 'w-16 p-2') : 'w-64 p-5'} bg-[#FAFAFA] text-[#171717cc] dark:bg-[#171717] dark:text-[#fafafacc] fixed h-full left-0 top-0 transition-all duration-300 ease-in-out z-20 ${isMobile && !sidebarCollapsed ? 'translate-x-0' : isMobile ? '-translate-x-full' : 'translate-x-0'} flex flex-col border-r border-gray-200 dark:border-[#171717]`}>
        {/* Sidebar Header */}
        <div className={`flex items-center justify-between mb-4 ${isMobile && sidebarCollapsed ? 'hidden' : ''}`}>
          {!sidebarCollapsed && (
            <h2 className="text-xl font-bold text-[#121212] dark:text-[#fafafa]">EduExtract</h2>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa1a] transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg 
              className={`w-5 h-5 text-[#171717cc] dark:text-[#fafafacc] transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className={`mt-4 flex-1 ${isMobile && sidebarCollapsed ? 'hidden' : ''}`}>
          <ul className="space-y-2">
            <li>
              <Link
                to="/"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa1a] transition-colors group`}
                title="Home"
              >
                {!sidebarCollapsed && (
                  <svg className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                )}
                {sidebarCollapsed && (
                  <svg className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                )}
                {!sidebarCollapsed && (
                  <span className="ml-3 group-hover:text-[#171717] dark:group-hover:text-[#fafafa] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }}>Home</span>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa1a] transition-colors group`}
                title="Dashboard"
              >
                {!sidebarCollapsed && (
                  <svg className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                )}
                {sidebarCollapsed && (
                  <svg className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                )}
                {!sidebarCollapsed && (
                  <span className="ml-3 group-hover:text-[#171717] dark:group-hover:text-[#fafafa] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }}>Dashboard</span>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/content"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa1a] transition-colors group`}
                title="My Content"
              >
                {!sidebarCollapsed && (
                  <svg className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {sidebarCollapsed && (
                  <svg className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {!sidebarCollapsed && (
                  <span className="ml-3 group-hover:text-[#171717] dark:group-hover:text-[#fafafa] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }}>My Content</span>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/marketplace"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa1a] transition-colors group`}
                title="Marketplace"
              >
                {!sidebarCollapsed && (
                  <svg className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                )}
                {sidebarCollapsed && (
                  <svg className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                )}
                {!sidebarCollapsed && (
                  <span className="ml-3 group-hover:text-[#171717] dark:group-hover:text-[#fafafa] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }}>Marketplace</span>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/forum"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa1a] transition-colors group`}
                title="Forum"
              >
                {!sidebarCollapsed && (
                  <svg className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                )}
                {sidebarCollapsed && (
                  <svg className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                )}
                {!sidebarCollapsed && (
                  <span className="ml-3 group-hover:text-[#171717] dark:group-hover:text-[#fafafa] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }}>Forum</span>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/collaborate"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa1a] transition-colors group`}
                title="CollaborateHub"
              >
                {!sidebarCollapsed && (
                  <svg className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )}
                {sidebarCollapsed && (
                  <svg className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )}
                {!sidebarCollapsed && (
                  <span className="ml-3 group-hover:text-[#171717] dark:group-hover:text-[#fafafa] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }}>CollaborateHub</span>
                )}
              </Link>
            </li>
          </ul>
        </nav>

        {/* User Profile Section - Bottom of Sidebar */}
        {user && (
          <div className={`mt-auto border-t border-gray-200 dark:border-[#fafafa1a] pt-4 ${isMobile && sidebarCollapsed ? 'hidden' : ''} relative`} data-dropdown="user-menu">
            {/* User Profile Clickable Area */}
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-2 rounded-2xl hover:bg-[#fafafa1a] dark:hover:bg-[#fafafa1a] transition-all duration-300 group hover:shadow-lg`}
            >
              {!sidebarCollapsed && (
                <div className="flex items-center w-full">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-400 dark:to-gray-600 rounded-full flex items-center justify-center mr-3 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                    <svg className="w-5 h-5 text-white dark:text-gray-900 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 transition-transform duration-300 text-left">
                    <p className="text-sm font-medium text-[#171717] dark:text-[#fafafa] truncate">
                      {user?.displayName || 'User'}
                    </p>
                    <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] truncate">
                      {user?.email}
                    </p>
                  </div>
                  <svg className={`w-4 h-4 text-[#4B5563] dark:text-[#9CA3AF] transition-all duration-300 group-hover:scale-110 ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
              {sidebarCollapsed && (
                <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-400 dark:to-gray-600 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                  <svg className="w-5 h-5 text-white dark:text-gray-900 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}
            </button>

            {/* Dropdown Menu */}
            {isUserDropdownOpen && !sidebarCollapsed && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-1 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-2xl shadow-lg z-30 animate-slideInFromBottom">
                <div className="py-0">
                  {/* Settings */}
                  <button
                    onClick={() => {
                      setIsSettingsOpen(true);
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full flex rounded-2xl items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#fafafa1a] dark:hover:bg-[#fafafa1a] transition-all duration-200 group"
                  >
                    <svg className="w-4 h-4 mr-3 group-hover:scale-110 group-hover:rotate-90 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Settings</span>
                  </button>

                  {/* Pricing */}
                  <button
                    className="w-full flex rounded-2xl items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#fafafa1a] dark:hover:bg-[#fafafa1a] transition-all duration-200 group"
                  >
                    <svg className="w-4 h-4 mr-3 group-hover:scale-110 group-hover:rotate-12 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>Pricing</span>
                  </button>

                  {/* History */}
                  <button
                    className="w-full flex rounded-2xl items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#fafafa1a] dark:hover:bg-[#fafafa1a] transition-all duration-200 group"
                  >
                    <svg className="w-4 h-4 mr-3 group-hover:scale-110 group-hover:rotate-12 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>History</span>
                  </button>

                  {/* Dark Mode Toggle */}
                  <div className="flex rounded-2xl items-center justify-between px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#fafafa1a] transition-all duration-200 group">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-3 group-hover:scale-110 group-hover:rotate-12 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      <span>Dark mode</span>
                    </div>
                    <div className="group-hover:scale-110 transition-transform duration-200">
                      <ThemeToggle />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-[#fafafa1a] my-1"></div>

                  {/* Logout */}
                  <button
                    onClick={() => {
                      logout();
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full flex rounded-2xl items-center px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-[#fafafa1a] dark:hover:bg-[#fafafa1a] transition-all duration-200 group"
                  >
                    <svg className="w-4 h-4 mr-3 group-hover:scale-110 group-hover:rotate-12 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
      {/* Right Content Area */}
      <div className={`${sidebarCollapsed ? (isMobile ? 'ml-0' : 'ml-16') : (isMobile ? 'ml-0' : 'ml-64')} relative transition-all duration-300 ease-in-out`}>
        {/* Topbar */}
        <header className={`fixed top-0 ${sidebarCollapsed ? (isMobile ? 'left-0' : 'left-16') : (isMobile ? 'left-0' : 'left-64')} right-0 h-16 bg-[#FAFAFA] text-[#171717cc] dark:bg-[#171717] dark:text-[#fafafacc] flex justify-between items-center px-3 sm:px-6 z-10 shadow-sm transition-all duration-300 ease-in-out overflow-hidden`}>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors lg:hidden"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg 
                className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-sm sm:text-lg font-semibold text-[#121212] dark:text-[#fafafa] hidden sm:block"></h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <button
                onClick={() => setIsUserModalOpen(!isUserModalOpen)}
                className="relative p-2 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-400 dark:to-gray-600 hover:bg-[#fafafa1a] dark:hover:bg-[#fafafa1a] shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                title="User Menu"
              >
                <svg 
                  className="w-6 h-6 text-white dark:text-gray-900" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                {isUserModalOpen && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-900"></div>
                )}
              </button>
            ) : (
              <button
                onClick={toggleAuthModal}
                className="px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm rounded-full bg-zinc-800 text-white hover:bg-[#fafafa1a] dark:hover:bg-[#fafafa1a]"
              >
                <span className="hidden sm:inline">Sign In</span>
                <span className="sm:hidden">Login</span>
              </button>
            )}
          </div>
        </header>
        {/* Page Content */}
        <main 
          className="pt-16 md:px-0 px-0  min-h-screen overflow-y-auto bg-[#FFFFFF] text-[#171717cc] dark:bg-[#121212] dark:text-[#fafafacc] transition-colors duration-300"
        >
          {isPageLoading ? (
            <PageLoader />
          ) : (
            <div className="animate-fadeIn">
              <Outlet />
            </div>
          )}
        </main>
      </div>
      <AuthModal />
      <UserModal 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
        user={user}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default Layout;