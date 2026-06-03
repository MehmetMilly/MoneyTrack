import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useAppStore } from '../lib/data/store';
import { router } from './Router';

export default function App() {
  const settings = useAppStore((state) => state.settings);
  const initializeApp = useAppStore((state) => state.initializeApp);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  useEffect(() => {
    const resolvedTheme = settings.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.theme;

    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  }, [settings.theme]);

  useEffect(() => {
    if (settings.theme !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (event: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, [settings.theme]);

  return <RouterProvider router={router} />;
}
