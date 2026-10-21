import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { BOOT_SCRIPT } from '@/lib/theme';
import { Footer } from '@/components/footer/footer';
import { ThemeToggle } from '@/components/theme-toggle/theme-toggle';
import '@/app/globals.css';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('metadata');

  return { title: t('title'), description: t('description') };
};

// The browser's address bar takes the page background (see --bg in globals.css).
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1816' },
  ],
};

const RootLayout = async (props: LayoutProps<'/'>) => {
  const { children } = props;

  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <ThemeToggle />
          {children}
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
