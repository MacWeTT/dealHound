'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import './theme-toggle.css';

const noopSubscribe = () => {
  return () => {};
};

/** One click flips between light and dark. The first visit follows the system setting. */
export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations('common.theme');

  // The theme is only known in the browser; render a neutral button until then to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => {
      return true;
    },
    () => {
      return false;
    },
  );

  const isDark = mounted && resolvedTheme === 'dark';
  const label = !mounted ? t('toggle') : isDark ? t('toLight') : t('toDark');
  const Icon = isDark ? Sun : Moon;

  const onToggle = () => {
    const { classList } = document.documentElement;

    classList.add('theme-transition');
    setTheme(isDark ? 'light' : 'dark');
    window.setTimeout(() => {
      return classList.remove('theme-transition');
    }, 400);
  };

  return (
    <button type="button" aria-label={label} disabled={!mounted} onClick={onToggle} className="theme-toggle">
      <Icon aria-hidden className="theme-toggle__icon" />
    </button>
  );
};
