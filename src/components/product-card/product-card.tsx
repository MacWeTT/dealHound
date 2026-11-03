import Link from 'next/link';

import type { CanonicalProductGroup, PaymentInstrument, PriceHistorySummary } from '@/domain/types';
import { formatInr, VERDICT_META } from '@/lib/inr';
import { buildProductHref } from '@/lib/wallet-query';

import './product-card.css';

interface ProductCardProps {
  group: CanonicalProductGroup;
  history: PriceHistorySummary;
  selectedCards?: PaymentInstrument[];
}

export const ProductCard = (props: ProductCardProps) => {
  const { group, history, selectedCards = [] } = props;
  const { slug, canonicalTitle, offers, specs, bestUnconditionalOffer, bestConditionalOffer } = group;
  const { verdict, median90dPaise, allTimeLowPaise } = history;
  const { retailerName: uncondStore, pricing: uncondPricing } = bestUnconditionalOffer;
  const { retailerName: condStore, pricing: condPricing } = bestConditionalOffer;
  const { unconditionalPricePaise } = uncondPricing;
  const { bestConditionalPricePaise, selectedPaymentLabel } = condPricing;
  const { gpu, cpu, ramGb, storageGb, mpn } = specs;

  const verdictInfo = VERDICT_META[verdict];
  const { label: verdictLabel, tone: verdictTone } = verdictInfo;
  const verdictClass = `product-card__verdict product-card__verdict--${verdictTone}`;
  const detailHref = buildProductHref(slug, selectedCards);
  const offerCount = offers.length;
  const storeCountLabel = offerCount === 1 ? '1 Indian store' : `${offerCount} Indian stores`;

  const specPills: string[] = [];

  if (gpu) {
    specPills.push(gpu.toUpperCase());
  }

  if (cpu) {
    specPills.push(cpu.toUpperCase());
  }

  if (ramGb !== undefined) {
    specPills.push(`${ramGb}GB RAM`);
  }

  if (storageGb !== undefined) {
    specPills.push(storageGb >= 1024 ? `${storageGb / 1024}TB SSD` : `${storageGb}GB SSD`);
  }

  if (mpn) {
    specPills.push(mpn);
  }

  const hasExtraCardDiscount = bestConditionalPricePaise < unconditionalPricePaise;
  const cardHeading = selectedCards.length > 0 ? 'Best With Your Cards' : 'Best With Bank Offer';

  return (
    <article className="product-card">
      <div className="product-card__meta">
        <span className="product-card__stores">{storeCountLabel}</span>
        <span className={verdictClass}>{verdictLabel}</span>
      </div>

      <Link href={detailHref} className="product-card__title">
        {canonicalTitle}
      </Link>

      {specPills.length > 0 ? (
        <div className="product-card__specs">
          {specPills.map(pill => {
            return (
              <span key={pill} className="product-card__spec">
                {pill}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="product-card__pricing">
        <div className="product-card__price-col">
          <span className="product-card__price-caption">Everyone’s Effective Price</span>
          <span className="product-card__price-main">{formatInr(unconditionalPricePaise)}</span>
          <span className="product-card__store-note">via {uncondStore}</span>
        </div>
        <div className="product-card__price-col">
          <span className="product-card__price-caption">{cardHeading}</span>
          <span className={hasExtraCardDiscount ? 'product-card__price-card' : 'product-card__price-main'}>
            {formatInr(bestConditionalPricePaise)}
          </span>
          <span className="product-card__store-note">
            {hasExtraCardDiscount ? `${condStore} · ${selectedPaymentLabel ?? 'Card offer'}` : `Same (${uncondStore})`}
          </span>
        </div>
      </div>

      <div className="product-card__footer">
        <span className="product-card__median">
          90d Median: {formatInr(median90dPaise)} · ATL: {formatInr(allTimeLowPaise)}
        </span>
        <Link href={detailHref} className="product-card__cta">
          Compare & Watch →
        </Link>
      </div>
    </article>
  );
};
