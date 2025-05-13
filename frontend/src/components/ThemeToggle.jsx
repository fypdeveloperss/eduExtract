import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  
  return (
    <button
      onClick={toggleTheme}
      className="
        p-2 rounded-xl border transition-all duration-300
        bg-[#FFFFFF] text-[#171717] hover:bg-[#EEEEEE]
        dark:bg-[#171717] dark:text-[#fafafa] dark:hover:bg-[#2E2E2E]
      "
    >
      {theme === "light" ? <Moon /> : <Sun />}
    </button>
  );
};

export default ThemeToggle;