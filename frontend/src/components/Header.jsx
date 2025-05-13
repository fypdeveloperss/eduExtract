import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

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

  return (
    <>
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
                    <Link to="/">EduExtract</Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-8">
                <a
                  href="#"
                  className="text-[#171717cc] hover:text-gray-900 relative group px-3 py-2"
                >
                  Features
                  <span className="inline-block ml-1">▼</span>
                </a>
                <a
                  href="#"
                  className="text-[#171717cc] hover:text-[#171717] px-3 py-2"
                >
                  Pricing
                </a>
                <a
                  href="#"
                  className="text-[#171717cc] hover:text-[#171717] px-3 py-2"
                >
                  Careers
                </a>
                <ul className="flex flex-row gap-10">
                  <li className="">
                    <Link
                      to="/about"
                      className="hover:text-[#171717] text-[#171717cc] "
                    >
                      About
                    </Link>
                  </li>
                  <li className="">
                    <Link
                      to="/contact"
                      className="hover:text-[#171717] text-[#171717cc] "
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex flex-row gap-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-[#171717] text-white px-4 py-2 rounded-md font-medium"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate("/login")}
                className="bg-[#171717] text-white px-4 py-2 rounded-md font-medium"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
export default Header;
