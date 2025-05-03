import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleTheme}
      className="
  p-2 rounded-xl border transition-all duration-300
  bg-white text-black hover:bg-gray-100
  dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700
"
    >
      {theme === 'light' ? <Moon /> : <Sun />}
    </button>
  );
};

export default ThemeToggle;
