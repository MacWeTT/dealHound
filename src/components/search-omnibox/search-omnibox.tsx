import Link from 'next/link';

import type { PaymentInstrument } from '@/domain/types';
import { buildSearchHref, serializeWalletParam } from '@/lib/wallet-query';

import './search-omnibox.css';

interface SearchOmniboxProps {
  defaultQuery?: string;
  selectedCards?: PaymentInstrument[];
  showQuickChips?: boolean;
}

const SAMPLE_QUERIES = [
  'RTX 5060 laptop',
  'RTX 5060 laptop under 90k',
  'MacBook Air M4',
  'RTX 5070',
  'Sony WH-1000XM5',
];

export const SearchOmnibox = (props: SearchOmniboxProps) => {
  const { defaultQuery = '', selectedCards = [], showQuickChips = false } = props;
  const serializedCards = serializeWalletParam(selectedCards);

  return (
    <div className="search-omnibox">
      <form action="/search" method="get" className="search-omnibox__form">
        <input
          name="q"
          type="search"
          defaultValue={defaultQuery}
          placeholder="Search an Indian product or paste an Amazon.in / Flipkart / MDComputers URL..."
          className="search-omnibox__input"
          aria-label="Search product or paste Indian store URL"
        />
        {serializedCards ? <input type="hidden" name="cards" value={serializedCards} /> : null}
        <button type="submit" className="search-omnibox__submit">
          Hunt Best Price
        </button>
      </form>
      {showQuickChips ? (
        <div className="search-omnibox__chips">
          <span className="search-omnibox__hint">Try:</span>
          {SAMPLE_QUERIES.map(sample => {
            return (
              <Link key={sample} href={buildSearchHref(sample, selectedCards)} className="search-omnibox__chip">
                {sample}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

