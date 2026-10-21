'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { THEME_KEY } from '@/lib/theme';
import './theme-toggle.css';

/** The page's theme is the `dark` class on <html> (set before paint by BOOT_SCRIPT), so watch that. */
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);

  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  return () => {
    return observer.disconnect();
  };
};

const getIsDark = () => {
  return document.documentElement.classList.contains('dark');
};

const getServerIsDark = () => {
  return false;
};

/** One click flips between light and dark. The first visit follows the system setting. */
export const ThemeToggle = () => {
  const t = useTranslations('common.theme');

  const isDark = useSyncExternalStore(subscribe, getIsDark, getServerIsDark);

  const label = isDark ? t('toLight') : t('toDark');
  const Icon = isDark ? Sun : Moon;

  const onToggle = () => {
    const { classList } = document.documentElement;

    classList.add('theme-transition');
    classList.toggle('dark', !isDark);
    window.setTimeout(() => {
      return classList.remove('theme-transition');
    }, 400);

    try {
      localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark');
    } catch {
      // Private mode: the choice just lasts until the page closes.
    }
  };

  return (
    <button type="button" aria-label={label} onClick={onToggle} className="theme-toggle" suppressHydrationWarning>
      <Icon aria-hidden className="theme-toggle__icon" />
    </button>
  );
};
