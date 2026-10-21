import { getRequestConfig } from 'next-intl/server';

/** dealHound speaks English for now. Another language is a new folder in `locales/` plus a way to pick it here. */
export default getRequestConfig(async () => {
  const locale = 'en';

  return { locale, messages: (await import(`../../locales/${locale}/index`)).default };
});
