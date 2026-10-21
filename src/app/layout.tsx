import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'dealHound',
  description: 'Search once, track every price, get pinged when it drops.',
};

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = (props: RootLayoutProps) => {
  const { children } = props;

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;
