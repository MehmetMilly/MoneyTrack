import { RouterProvider } from 'react-router-dom';
import { router } from './Router';
import { useEffect } from 'react';
import { useAppStore } from '../lib/data/store';

export default function App() {
  const settings = useAppStore((s) => s.settings);
  const initializeApp = useAppStore((s) => s.initializeApp);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Apply theme and direction on mount and settings change
  useEffect(() => {
    // Theme
    const resolved = settings.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.theme;
    document.documentElement.setAttribute('data-theme', resolved);

    // Direction + lang
    document.documentElement.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language;
  }, [settings.theme, settings.language]);

  // Listen for system theme changes
  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  return <RouterProvider router={router} />;
}
