import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Storage } from '../lib/platform/storage';

const ThemeContext = createContext(null);

function getInitialTheme() {
  try {
    const stored = Storage.getItem('scholomance-theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Ignore storage errors and fallback to default
  }
  return 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.setItem('scholomance-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return { theme: 'dark', toggleTheme: () => {} };
  }
  return context;
}
