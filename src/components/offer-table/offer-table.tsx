import type { EnrichedRetailerOffer } from '@/domain/types';
import { formatInr, formatRelativeFreshness } from '@/lib/inr';

import './offer-table.css';

interface OfferTableProps {
  offers: EnrichedRetailerOffer[];
  bestUnconditionalId: string;
  bestConditionalId: string;
}

export const OfferTable = (props: OfferTableProps) => {
  const { offers, bestUnconditionalId, bestConditionalId } = props;

  return (
    <div className="offer-table">
      {offers.map(offer => {
        const { id, retailerName, rawTitle, canonicalUrl, inStock, lastVerifiedAt, pricing } = offer;
        const {
          basePricePaise,
          unconditionalPricePaise,
          bestConditionalPricePaise,
          selectedPaymentLabel,
          adjustments,
        } = pricing;
        const isUncondWinner = id === bestUnconditionalId;
        const isCardWinner = id === bestConditionalId && bestConditionalPricePaise < unconditionalPricePaise;
        const rowClass = isUncondWinner ? 'offer-table__row offer-table__row--winner' : 'offer-table__row';

        return (
          <div key={id} className={rowClass}>
            <div className="offer-table__merchant">
              <div className="offer-table__merchant-top">
                <span className="offer-table__store-name">{retailerName}</span>
                {isUncondWinner ? <span className="offer-table__badge-win">Lowest Everyone’s Price</span> : null}
                {isCardWinner ? <span className="offer-table__badge-card">Best Card Net Price</span> : null}
              </div>
              <p className="offer-table__raw-title">{rawTitle}</p>
              {adjustments.length > 0 ? (
                <div className="offer-table__adjustments">
                  {adjustments.map(adj => {
                    const { ruleId, label, deltaPaise } = adj;
                    const isFee = deltaPaise > 0;
                    const prefix = isFee ? `+${formatInr(deltaPaise)}` : `−${formatInr(Math.abs(deltaPaise))}`;

                    return (
                      <span key={ruleId} className={isFee ? 'offer-table__rule-fee' : 'offer-table__rule-discount'}>
                        {prefix} · {label}
                      </span>
                    );
                  })}
                </div>
              ) : null}
              <span className="offer-table__freshness">
                {inStock ? 'In Stock' : 'Out of Stock'} · {formatRelativeFreshness(lastVerifiedAt)}
              </span>
            </div>

            <div className="offer-table__numbers">
              <div className="offer-table__price-stack">
                <span className="offer-table__sticker">Sticker: {formatInr(basePricePaise)}</span>
                <span className="offer-table__unconditional">{formatInr(unconditionalPricePaise)}</span>
                {bestConditionalPricePaise < unconditionalPricePaise ? (
                  <span className="offer-table__conditional">
                    {formatInr(bestConditionalPricePaise)} w/ {selectedPaymentLabel ?? 'Card'}
                  </span>
                ) : null}
              </div>
              <a href={canonicalUrl} target="_blank" rel="noopener noreferrer" className="offer-table__buy">
                View Store ↗
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
};
