import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/FirebaseAuthContext";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

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

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Navigation */}
      <nav
        className={`fixed w-full z-50 transition-all duration-300 ${
          isScrolled ? "bg-white dark:bg-gray-800 shadow-md" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <div className="font-bold text-2xl">
                    <Link className="text-black " to="/">EduExtract</Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-8">
                <a
                  href="#"
                  className="text-[#171717cc]  hover:text-gray-900 relative group px-3 py-2"
                >
                  Features
                  <span className="inline-block ml-1">▼</span>
                </a>
                <a
                  href="#"
                  className="text-[#171717cc]  hover:text-[#171717]  px-3 py-2"
                >
                  Pricing
                </a>
                <a
                  href="#"
                  className="text-[#171717cc]  hover:text-[#171717]  px-3 py-2"
                >
                  Careers
                </a>
                <ul className="flex flex-row gap-10">
                  <li className="">
                    <Link
                      to="/about"
                      className="hover:text-[#171717]  text-[#171717cc] "
                    >
                      About
                    </Link>
                  </li>
                  <li className="">
                    <Link
                      to="/marketplace"
                      className="hover:text-[#171717]  text-[#171717cc] "
                    >
                      Marketplace
                    </Link>
                  </li>
                  <li className="">
                    <Link
                      to="/contact"
                      className="hover:text-[#171717]  text-[#171717cc] "
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              
              {user ? (
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="bg-blue-500 hover:bg- text-white px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    className="bg-[#171717] dark:bg-[#171717] text-white px-4 py-2 rounded-md font-medium"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-white bg-[#171717] rounded-md  dark:text-white hover:text-gray-900 dark:hover:text-white px-4 py-2 text-md"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="bg-[#171717] dark:bg-[#171717] text-white px-4 py-2 rounded-md font-medium"
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
export default Header;
