import Link from 'next/link';

import './site-header.css';

interface SiteHeaderProps {
  activeWatchCount: number;
}

export const SiteHeader = (props: SiteHeaderProps) => {
  const { activeWatchCount } = props;

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand">
          <span className="site-header__logo">dealHound</span>
          <span className="site-header__region">IN · ₹</span>
        </Link>
        <nav className="site-header__nav">
          <Link href="/search?q=RTX+5060+laptop" className="site-header__link">
            Explore Deals
          </Link>
          <Link href="/watches" className="site-header__watches">
            <span>Discord Watches</span>
            <span className="site-header__count">{activeWatchCount}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

