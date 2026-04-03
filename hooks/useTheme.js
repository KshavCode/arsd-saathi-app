import { Colors } from '@/constants/themeStyle';
import { ThemeContext } from '@/context/ThemeContext';
import { useContext } from 'react';

export const useTheme = () => {
  const isColorDark = (hex) => {
    if (!hex) return false;
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  const { themeName, setThemeName } = useContext(ThemeContext);
  const theme = Colors[themeName] || Colors["Default"]
  const isDark = isColorDark(theme.background);
  return {
    theme,
    themeName,
    setThemeName,
    isDark
  };
};