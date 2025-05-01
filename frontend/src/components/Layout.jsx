// src/components/Layout.jsx
import { Outlet, Link } from "react-router-dom";

const Layout = () => {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white p-5 fixed h-full">
        <h2 className="text-xl font-bold">My App</h2>
        <nav className="mt-4">
          <ul>
            <li className="mb-2">
              <Link to="/" className="hover:text-gray-300">Home</Link>
            </li>
            <li className="mb-2">
              <Link to="/about" className="hover:text-gray-300">About</Link>
            </li>
            <li className="mb-2">
              <Link to="/contact" className="hover:text-gray-300">Contact</Link>
            </li>
            <li className="mb-2">
              <Link to="/flashcards" className="hover:text-gray-300">Flash Cards</Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Topbar */}
        <header className="bg-gray-900 text-white p-4 fixed w-full top-0 left-64">
          <h1 className="text-lg">Dashboard</h1>
        </header>

        {/* Page Content */}
        <main className="mt-16 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
