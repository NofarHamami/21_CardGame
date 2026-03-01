import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ThemeColors, ThemePresetName, themePresets, colors, setActiveTheme as setActiveThemeRaw } from './colors';

interface ThemeContextValue {
  colors: ThemeColors;
  activeTheme: ThemePresetName;
  setTheme: (theme: ThemePresetName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors,
  activeTheme: 'classic',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeTheme, setActiveThemeState] = useState<ThemePresetName>('classic');

  const setTheme = useCallback((theme: ThemePresetName) => {
    setActiveThemeRaw(theme);
    setActiveThemeState(theme);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    colors: { ...themePresets[activeTheme] },
    activeTheme,
    setTheme,
  }), [activeTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
