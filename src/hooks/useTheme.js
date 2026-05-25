import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  clearThemePreference,
  getEffectiveTheme,
  getStoredTheme,
  getSystemTheme,
  setThemePreference,
} from '../core/theme';

export function useTheme() {
  const [theme, setThemeState] = useState(() => getEffectiveTheme());
  const [followSystem, setFollowSystem] = useState(() => getStoredTheme() === null);

  useEffect(() => {
    applyTheme(getEffectiveTheme());
    setThemeState(getEffectiveTheme());
    setFollowSystem(getStoredTheme() === null);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (getStoredTheme() === null) {
        const next = getSystemTheme();
        applyTheme(next);
        setThemeState(next);
      }
    };
    mq.addEventListener('change', onSystemChange);
    return () => mq.removeEventListener('change', onSystemChange);
  }, []);

  const setTheme = useCallback((next) => {
    setThemePreference(next);
    setThemeState(next);
    setFollowSystem(false);
  }, []);

  const setFollowSystemMode = useCallback(() => {
    clearThemePreference();
    const next = getSystemTheme();
    setThemeState(next);
    setFollowSystem(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, followSystem, setTheme, setFollowSystemMode, toggleTheme };
}
