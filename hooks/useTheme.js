import { Colors } from '@/constants/themeStyle';
import { ThemeContext } from '@/context/ThemeContext';
import { useContext } from 'react';

export const useTheme = () => {
  const { themeName, setThemeName } = useContext(ThemeContext);
  const theme = Colors[themeName] || Colors["pinkish"]
  return {
    theme,
    themeName,
    setThemeName
  };
};