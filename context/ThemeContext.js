import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useEffect, useState } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('DARK_THEME');
      if (saved !== null) {
        setIsDarkMode(JSON.parse(saved));
      }
    };
    load();
  }, []);

  const toggleTheme = async () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    await AsyncStorage.setItem('DARK_THEME', JSON.stringify(next));
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};