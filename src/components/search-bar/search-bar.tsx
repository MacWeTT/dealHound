'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, SubmitEvent } from 'react';
import { isSearchShortcut } from '@/lib/search-shortcut';
import './search-bar.css';

/** The universal search bar. For now it is the finished shell: typing, clearing and the `/` shortcut work, search itself comes next. */
export const SearchBar = () => {
  const [state, setState] = useState({ query: '' });
  const { query } = state;

  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('home.search');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isSearchShortcut(event)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      return window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const onQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setState({ query: event.target.value });
  };

  const onClear = () => {
    setState({ query: '' });
    inputRef.current?.focus();
  };

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <form role="search" className="search-bar" onSubmit={onSubmit}>
      <Search aria-hidden className="search-bar__icon" />
      <input
        ref={inputRef}
        type="text"
        name="q"
        value={query}
        onChange={onQueryChange}
        className="search-bar__input"
        placeholder={t('placeholder')}
        aria-label={t('label')}
        autoComplete="off"
        enterKeyHint="search"
      />
      {query ? (
        <button type="button" className="search-bar__clear" aria-label={t('clear')} onClick={onClear}>
          <X aria-hidden className="search-bar__clear-icon" />
        </button>
      ) : (
        <kbd aria-hidden className="search-bar__hint">
          {t('shortcut')}
        </kbd>
      )}
    </form>
  );
};
