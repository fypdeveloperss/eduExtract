import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  
  return (
    <button
      onClick={toggleTheme}
      className="
        relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
        bg-gray-200 dark:bg-[#fafafa1a]
        hover:bg-gray-300 dark:hover:bg-[#fafafa2a]
      "
      role="switch"
      aria-checked={theme === "dark"}
      aria-label="Toggle theme"
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out
          ${theme === "dark" ? "translate-x-6" : "translate-x-1"}
        `}
      />
      <div className="absolute inset-0 flex items-center justify-between px-1.5">
        <Sun className="h-4 w-4 text-gray-500" />
        <Moon className="h-4 w-4 text-gray-500" />
      </div>
    </button>
  );
};

export default ThemeToggle;