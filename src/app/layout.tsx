import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@/app/globals.css';
import { SiteHeader } from '@/components/site-header/site-header';
import { defaultDealService } from '@/server/services/deal-service';

export const metadata: Metadata = {
  title: 'dealHound India — Effective Price Tracker & Discord Alerts',
  description:
    'Search once across Indian stores, calculate real bank-card prices, get pinged on Discord when it drops.',
};

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = (props: RootLayoutProps) => {
  const { children } = props;
  const { watches } = defaultDealService.listWatchesAndOutbox();
  const activeCount = watches.filter(watch => {
    return watch.state !== 'paused';
  }).length;

  return (
    <html lang="en">
      <body>
        <SiteHeader activeWatchCount={activeCount} />
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
