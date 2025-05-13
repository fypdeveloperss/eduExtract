import { Outlet, Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const Layout = () => {
  return (
    <>
      {/* Sidebar */}
      <aside className="w-64 bg-[#f4f4f5] text-[#1f1f1f] dark:bg-[#171717] dark:text-[#ffffffde] p-5 fixed h-full left-0 top-0">
        <h2 className="text-xl font-bold">EduExtract</h2>
        <nav className="mt-4">
          <ul>
            <li className="mb-2">
              <Link
                to="/"
                className="hover:text-[#4b5563] dark:hover:text-[#cbd5e1]"
              >
                Home
              </Link>
            </li>
            <li className="mb-2">
              <Link
                to="/dashboard"
                className="hover:text-[#4b5563] dark:hover:text-[#cbd5e1]"
              >
                Dashboard
              </Link>
            </li>
            
          </ul>
        </nav>
      </aside>

      {/* Right Content Area */}
      <div className="ml-64">
        {/* Topbar */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-[#e4e4e7] text-[#1f1f1f] dark:bg-[#1d1d1d] dark:text-white flex justify-between items-center px-6 z-10 shadow-sm">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <ThemeToggle />
        </header>

        {/* Page Content */}
        <main className="pt-20 p-6 h-screen overflow-y-auto bg-[#ffffff] text-[#111111] dark:bg-[#121212] dark:text-[#e2e8f0] transition-colors duration-300">
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default Layout;
