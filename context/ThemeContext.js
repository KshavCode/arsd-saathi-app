import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useEffect, useState } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeName, setTheme] = useState('Default');

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('THEME');
      if (saved !== null) {
        setThemeName(JSON.parse(saved));
      }
    };
    load();
  }, []);

  const setThemeName = async (newTheme) => {
    setTheme(newTheme);
    await AsyncStorage.setItem('THEME', JSON.stringify(newTheme));
  };

  return (
    <ThemeContext.Provider value={{ themeName, setThemeName}}>
      {children}
    </ThemeContext.Provider>
  );
};