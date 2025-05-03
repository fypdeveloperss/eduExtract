// src/components/Layout.jsx
import { Outlet, Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const Layout = () => {
  return (
    <>
      {/* Sidebar */}
      <aside className="w-64 bg-gray-100 dark:bg-gray-800 dark:text-white text-black p-5 fixed h-full left-0 top-0">
        <h2 className="text-xl font-bold">My App</h2>
        <nav className="mt-4">
          <ul>
            <li className="mb-2">
              <Link to="/" className="hover:text-gray-500 dark:hover:text-gray-300">Home</Link>
            </li>
            <li className="mb-2">
              <Link to="/about" className="hover:text-gray-500 dark:hover:text-gray-300">About</Link>
            </li>
            <li className="mb-2">
              <Link to="/contact" className="hover:text-gray-500 dark:hover:text-gray-300">Contact</Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Right Content Area */}
      <div className="ml-64">
        {/* Topbar */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-gray-200 dark:bg-gray-900 text-black dark:text-white flex justify-between items-center p-4 z-10">
          <h1 className="text-lg">Dashboard</h1>
          <ThemeToggle />
        </header>

        {/* Page Content */}
        <main className="pt-16 p-6 h-screen overflow-y-auto bg-gray-50 dark:bg-gray-700 text-black dark:text-white">
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default Layout;
