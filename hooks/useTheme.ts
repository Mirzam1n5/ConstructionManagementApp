import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getJSON, setJSON } from './useStorage';

const THEME_STORAGE_KEY = 'isker_theme_dark';

export const LIGHT = {
  bg:'#f5f6f8',       panel:'#ffffff',    card:'#ffffff',     border:'#e8e9ed',
  text:'#15161a',     sub:'#6b6d76',      muted:'#9b9da6',
  green:'#34b378',    greenDim:'#e6f7ee',
  red:'#e8604a',      redDim:'#fdeae5',
  yellow:'#e0a830',   yellowDim:'#fdf3e0',
  blue:'#5aa8e8',     blueDim:'#e9f3fd',
  accent:'#c4895a',   accentDim:'#f6ece1',
  orange:'#f5a558',   orangeDim:'#fdf0e1',
  cyan:'#5aa8e8',     cyanDim:'#e9f3fd',
  shadow:'rgba(15,16,20,0.06)',
};

export const DARK = {
  bg:'#0e0f12',       panel:'#15161a',    card:'#1a1b20',     border:'#262830',
  text:'#f0f1f4',     sub:'#8e9099',      muted:'#4a4c55',
  green:'#5fa97f',    greenDim:'#13201a',
  red:'#d97a5c',      redDim:'#241510',
  yellow:'#d6a84f',   yellowDim:'#241e10',
  blue:'#7fb0d4',     blueDim:'#10202c',
  accent:'#c98a52',   accentDim:'#221a10',
  orange:'#e8a667',   orangeDim:'#241c10',
  cyan:'#7fb0d4',     cyanDim:'#10202c',
  shadow:'rgba(0,0,0,0.45)',
};

export type Palette = typeof LIGHT;

export interface ThemeContextType {
  D: Palette;
  isDark: boolean;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  D: DARK, isDark: true, toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function usePersistedTheme() {
  const [isDark, setIsDarkState] = useState(true);

  useEffect(() => {
    let mounted = true;
    getJSON<boolean>(THEME_STORAGE_KEY, true).then(v => {
      if (mounted) setIsDarkState(v);
    });
    return () => { mounted = false; };
  }, []);

  const setIsDark = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setIsDarkState(prev => {
      const next = typeof v === 'function' ? (v as any)(prev) : v;
      setJSON(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  return [isDark, setIsDark] as const;
}
