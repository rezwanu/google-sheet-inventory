import { useState, useEffect, useCallback } from 'react';

const THEME_STORAGE_KEY = 'pos_ui_theme';

/**
 * UI থিম ম্যানেজমেন্ট হুক ('light' | 'dark' | 'system')
 * শুধুমাত্র লোকাল UI থিম প্রিফারেন্স সংরক্ষণ করে — কোনো ব্যবসার ডাটা বা Google Sheets সিঙ্ক স্পর্শ করে না।
 */
export function resolveIsDark(mode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export function applyThemeClass(mode) {
  if (typeof document === 'undefined') return;
  const isDark = resolveIsDark(mode);
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export default function useTheme() {
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {}
    return 'light';
  });

  const [isDark, setIsDark] = useState(() => resolveIsDark(themeMode));

  useEffect(() => {
    applyThemeClass(themeMode);
    setIsDark(resolveIsDark(themeMode));
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {}
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      applyThemeClass('system');
      setIsDark(mq.matches);
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [themeMode]);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const currentlyDark = resolveIsDark(prev);
      return currentlyDark ? 'light' : 'dark';
    });
  }, []);

  return {
    themeMode,
    setThemeMode,
    isDark,
    toggleTheme,
  };
}
