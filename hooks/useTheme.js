import { Colors } from '@/constants/themeStyle';
import { ThemeContext } from '@/context/ThemeContext';
import { useContext } from 'react';

export const useTheme = () => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);

  const theme = isDarkMode ? Colors.dark : Colors.light;

  return {
    theme,
    isDarkMode,
    toggleTheme
  };
};