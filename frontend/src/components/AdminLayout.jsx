import { Outlet, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import AuthModal from "./AuthModal";
import { useAuth } from "../context/FirebaseAuthContext";

// Add CSS keyframes for fadeIn animation
const fadeInKeyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = fadeInKeyframes;
  document.head.appendChild(style);
}

const AdminLayout = () => {
  const { user, logout, toggleAuthModal } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
      <aside className={`${sidebarCollapsed ? (isMobile ? 'w-0 p-0' : 'w-16 p-2') : 'w-64 p-5'} bg-[#FAFAFA] text-[#171717cc] dark:bg-[#171717] dark:text-[#fafafacc] fixed h-full left-0 top-0 transition-all duration-300 ease-in-out z-20 ${isMobile && !sidebarCollapsed ? 'translate-x-0' : isMobile ? '-translate-x-full' : 'translate-x-0'}`}>
        {/* Sidebar Header */}
        <div className={`flex items-center justify-between mb-4 ${isMobile && sidebarCollapsed ? 'hidden' : ''}`}>
          {!sidebarCollapsed && (
            <h2 className="text-xl font-bold text-[#121212] dark:text-[#fafafa] whitespace-nowrap">Admin Control</h2>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
        <nav className={`mt-4 ${isMobile && sidebarCollapsed ? 'hidden' : ''}`}>
          <ul className="space-y-2">
            <li>
              <Link
                to="/"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group`}
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
                to="/admin"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group`}
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
                to="/admin/users"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group`}
                title="User Management"
              >
                {!sidebarCollapsed && (
                  <svg className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                )}
                {sidebarCollapsed && (
                  <svg className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                )}
                {!sidebarCollapsed && (
                  <span className="ml-3 group-hover:text-[#171717] dark:group-hover:text-[#fafafa] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }}>Users</span>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/admin/admins"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group`}
                title="Admin Management"
              >
                {!sidebarCollapsed && (
                  <svg className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
                {sidebarCollapsed && (
                  <svg className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
                {!sidebarCollapsed && (
                  <span className="ml-3 group-hover:text-[#171717] dark:group-hover:text-[#fafafa] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }}>Admins</span>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/admin/content"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group`}
                title="Content Management"
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
                  <span className="ml-3 group-hover:text-[#171717] dark:group-hover:text-[#fafafa] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }}>Content</span>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/admin/ai-monitoring"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group`}
                title="AI Monitoring"
              >
                {!sidebarCollapsed && (
                  <svg className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                )}
                {sidebarCollapsed && (
                  <svg className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                )}
                {!sidebarCollapsed && (
                  <span className="ml-3 group-hover:text-[#171717] dark:group-hover:text-[#fafafa] opacity-0" style={{ animation: 'fadeIn 0.5s ease-in-out 0.2s forwards' }}>AI Monitor</span>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/admin/marketplace"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group`}
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
                to="/admin/forum-moderation"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} py-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group`}
                title="Forum Moderation"
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
          </ul>
        </nav>
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
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Show full email on desktop, truncated on mobile */}
                <span className="text-sm hidden sm:block">{user.email}</span>
                <span className="text-xs sm:hidden max-w-20 truncate">
                  {user.email.split('@')[0]}
                </span>
                <button
                  onClick={logout}
                  className="px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm rounded-md bg-zinc-800 text-white hover:bg-zinc-700"
                >
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={toggleAuthModal}
                className="px-2 py-2 sm:px-4 sm:py-4 text-xs sm:text-sm rounded-md bg-zinc-800 text-white hover:bg-zinc-700"
              >
                <span className="hidden sm:inline">Sign In</span>
                <span className="sm:hidden">Login</span>
              </button>
            )}
          </div>
        </header>
        {/* Page Content */}
        <main 
          className="pt-20 p-6 min-h-screen overflow-y-auto bg-[#FFFFFF] text-[#171717cc] dark:bg-[#121212] dark:text-[#fafafacc] transition-colors duration-300"
        >
          <Outlet />
        </main>
      </div>
      <AuthModal />
    </div>
  );
};

export default AdminLayout;