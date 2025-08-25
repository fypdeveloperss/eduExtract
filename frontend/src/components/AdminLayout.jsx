import { Outlet, Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/FirebaseAuthContext";

const AdminLayout = () => {
  const { user, logout, toggleAuthModal } = useAuth();

  return (
    <div className="relative min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#FAFAFA] text-[#171717cc] dark:bg-[#171717] dark:text-[#fafafacc] p-5 fixed h-full left-0 top-0 overflow-y-auto">
        <h2 className="text-2xl font-bold text-[#121212] dark:text-[#fafafa] mb-6">Admin Control Center</h2>
        <nav className="mt-4">
          <ul>
            <li className="mb-2">
              <Link
                to="/"
                className="block p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                🏠 Home
              </Link>
            </li>
            <li className="mb-2">
              <Link
                to="/admin"
                className="block p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Dashboard
              </Link>
            </li>
            <li className="mb-2">
              <Link
                to="/admin/users"
                className="block p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                User Management
              </Link>
            </li>
            <li className="mb-2">
              <Link
                to="/admin/admins"
                className="block p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Admin Management
              </Link>
            </li>
            <li className="mb-2">
              <Link
                to="/admin/content"
                className="block p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Content Management
              </Link>
            </li>
            <li className="mb-2">
              <Link
                to="/admin/ai-monitoring"
                className="block p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                AI Monitoring
              </Link>
            </li>
            <li className="mb-2">
              <Link
                to="/admin/marketplace"
                className="block p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Marketplace
              </Link>
            </li>
            <li className="mb-2">
              <Link
                to="/admin/forum-moderation"
                className="block p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Forum Moderation
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col">
        {/* Topbar */}
        <header className="h-16 bg-[#FAFAFA] text-[#171717cc] dark:bg-[#171717] dark:text-[#fafafacc] flex justify-between items-center px-6 z-10 shadow-sm">
          <h1 className="text-lg font-semibold text-[#121212] dark:text-[#fafafa]">Dashboard Overview</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{user.email}</span>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-md bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={toggleAuthModal}
                className="px-4 py-2 rounded-md bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto bg-[#FFFFFF] text-[#171717cc] dark:bg-[#121212] dark:text-[#fafafacc] transition-colors duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;