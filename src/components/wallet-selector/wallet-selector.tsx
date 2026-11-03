import Link from 'next/link';

import type { PaymentInstrument } from '@/domain/types';
import { INDIAN_PAYMENT_OPTIONS } from '@/lib/inr';

import './wallet-selector.css';

interface WalletSelectorProps {
  basePath: string;
  query?: string;
  selectedCards: PaymentInstrument[];
}

const buildToggledHref = (basePath: string, query: string | undefined, cards: PaymentInstrument[]): string => {
  const params = new URLSearchParams();

  if (query && query.trim()) {
    params.set('q', query.trim());
  }

  if (cards.length > 0) {
    params.set('cards', cards.join(','));
  }

  const qs = params.toString();

  return qs ? `${basePath}?${qs}` : basePath;
};

export const WalletSelector = (props: WalletSelectorProps) => {
  const { basePath, query, selectedCards } = props;

  return (
    <div className="wallet-selector">
      <span className="wallet-selector__label">Your Indian Cards:</span>
      {INDIAN_PAYMENT_OPTIONS.map(option => {
        const { id, shortLabel } = option;
        const isActive = selectedCards.includes(id);
        const nextCards = isActive
          ? selectedCards.filter(item => {
              return item !== id;
            })
          : [...selectedCards, id];
        const pillClass = isActive ? 'wallet-selector__pill wallet-selector__pill--active' : 'wallet-selector__pill';

        return (
          <Link key={id} href={buildToggledHref(basePath, query, nextCards)} className={pillClass} scroll={false}>
            {shortLabel}
          </Link>
        );
      })}
      {selectedCards.length > 0 ? (
        <Link href={buildToggledHref(basePath, query, [])} className="wallet-selector__clear" scroll={false}>
          Show all card offers
        </Link>
      ) : null}
    </div>
  );
};
