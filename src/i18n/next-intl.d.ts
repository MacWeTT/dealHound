import type en from '@locales/en';

// Typed message keys: a `t('missing.key')` fails the typecheck.
declare module 'next-intl' {
  interface AppConfig {
    Locale: 'en';
    Messages: typeof en;
  }
}
