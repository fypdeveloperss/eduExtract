import { Outlet, Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import ChatBot from "./ChatBot";
import AuthModal from "./AuthModal";
import { useAuth } from "../context/FirebaseAuthContext";

const Layout = () => {
  const { user, logout, toggleAuthModal } = useAuth();

  return (
    <div className="relative min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-[#FAFAFA] text-[#171717cc] dark:bg-[#171717] dark:text-[#fafafacc] p-5 fixed h-full left-0 top-0">
        <h2 className="text-xl font-bold text-[#121212] dark:text-[#fafafa]">EduExtract</h2>
        <nav className="mt-4">
          <ul>
            <li className="mb-2">
              <Link
                to="/"
                className="hover:text-[#171717] dark:hover:text-[#fafafa]"
              >
                Home
              </Link>
            </li>
            <li className="mb-2">
              <Link
                to="/dashboard"
                className="hover:text-[#171717] dark:hover:text-[#fafafa]"
              >
                Dashboard
              </Link>
            </li>
             <li className="mb-2">
              <Link
                to="/content"
                className="hover:text-[#171717] dark:hover:text-[#fafafa]"
              >
                My Content
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
      {/* Right Content Area */}
      <div className="ml-64 relative">
        {/* Topbar */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-[#FAFAFA] text-[#171717cc] dark:bg-[#171717] dark:text-[#fafafacc] flex justify-between items-center px-6 z-10 shadow-sm">
          <h1 className="text-lg font-semibold text-[#121212] dark:text-[#fafafa]">Dashboard</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm">{user.email}</span>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-md bg-zinc-800 text-white hover:bg-zinc-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={toggleAuthModal}
                className="px-4 py-2 rounded-md bg-zinc-800 text-white hover:bg-zinc-700"
              >
                Sign In
              </button>
            )}
          </div>
        </header>
        {/* Page Content */}
        <main className="pt-20 p-6 min-h-screen overflow-y-auto bg-[#FFFFFF] text-[#171717cc] dark:bg-[#121212] dark:text-[#fafafacc] transition-colors duration-300">
          <Outlet />
        </main>
      </div>
      <AuthModal />
    </div>
  );
};

export default Layout;