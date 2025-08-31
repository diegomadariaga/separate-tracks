import React, { useEffect, useState } from 'react';
import { Button } from '@repo/ui';

const STORAGE_KEY = 'app-theme';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  useEffect(() => {
    const body = document.body;
    if (theme === 'light') body.classList.add('theme-light'); else body.classList.remove('theme-light');
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <Button variant="secondary" size="md" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ position: 'fixed', top: 16, right: 16, zIndex: 50 }}>
      {theme === 'dark' ? '🌞 Claro' : '🌙 Oscuro'}
    </Button>
  );
};
