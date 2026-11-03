import 'server-only';

import { calculateEffectivePrice } from '@/domain/effective-price';
import { recordPriceObservation, summarizePriceHistory } from '@/domain/price-history';
import type { CanonicalProductGroup, PriceHistorySummary, PriceSpan, RawRetailerOffer } from '@/domain/types';
import type { DealStore } from '@/server/store/deal-store';

export const summarizeForGroup = (
  group: CanonicalProductGroup,
  allSpans: PriceSpan[],
  nowIso: string,
): PriceHistorySummary => {
  const { offers, bestUnconditionalOffer } = group;
  const { id: leadId, pricing: leadPricing } = bestUnconditionalOffer;
  const leadSpans = allSpans.filter(span => {
    return span.offerId === leadId;
  });

  if (leadSpans.length > 0) {
    return summarizePriceHistory(leadSpans, nowIso, 'unconditional');
  }

  const offerIds = new Set(
    offers.map(item => {
      return item.id;
    }),
  );
  const fallbackSpans = allSpans.filter(span => {
    return offerIds.has(span.offerId);
  });

  if (fallbackSpans.length > 0) {
    return summarizePriceHistory(fallbackSpans, nowIso, 'unconditional');
  }

  const fallbackPrice = leadPricing.unconditionalPricePaise;

  return {
    currentPaise: fallbackPrice,
    allTimeLowPaise: fallbackPrice,
    allTimeHighPaise: fallbackPrice,
    median90dPaise: fallbackPrice,
    vsMedianBps: 0,
    preSaleHikeDetected: false,
    verdict: 'fair_price',
    verdictReason: 'First observation recorded.',
  };
};

export const mergeDiscoveredOffers = (store: DealStore, incoming: RawRetailerOffer[], nowIso: string): void => {
  if (incoming.length === 0) {
    return;
  }

  store.writeState(current => {
    const { offers, spans } = current;
    const byUrl = new Map(
      offers.map(offer => {
        return [offer.canonicalUrl, offer];
      }),
    );
    let nextSpans = spans;

    for (const candidate of incoming) {
      const { id, canonicalUrl, retailerId, basePricePaise, priceRules, inStock } = candidate;
      const existing = byUrl.get(canonicalUrl);
      const effectiveOfferId = existing ? existing.id : id;
      const mergedOffer = existing ? { ...existing, basePricePaise, inStock, lastVerifiedAt: nowIso } : candidate;

      byUrl.set(canonicalUrl, mergedOffer);
      const { unconditionalPricePaise, bestConditionalPricePaise } = calculateEffectivePrice(
        basePricePaise,
        mergedOffer.priceRules ?? priceRules,
      );

      nextSpans = recordPriceObservation(nextSpans, {
        id: `span-${crypto.randomUUID()}`,
        offerId: effectiveOfferId,
        retailerId,
        basePricePaise,
        unconditionalPricePaise,
        bestConditionalPricePaise,
        inStock,
        observedAt: nowIso,
      });
    }

    return {
      ...current,
      offers: Array.from(byUrl.values()),
      spans: nextSpans,
    };
  });
};

