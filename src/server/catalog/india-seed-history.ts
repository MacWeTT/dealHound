import 'server-only';

import { calculateEffectivePrice } from '@/domain/effective-price';
import type { PriceSpan, RawRetailerOffer } from '@/domain/types';
import { INDIA_SEED_OFFERS } from '@/server/catalog/india-seed-offers';

interface HistoricalPoint {
  daysAgoStart: number;
  daysAgoEnd: number | null;
  multiplierBps: number;
}

const DEFAULT_TRAJECTORY: HistoricalPoint[] = [
  { daysAgoStart: 90, daysAgoEnd: 58, multiplierBps: 10_650 },
  { daysAgoStart: 58, daysAgoEnd: 34, multiplierBps: 10_400 },
  { daysAgoStart: 34, daysAgoEnd: 14, multiplierBps: 10_800 },
  { daysAgoStart: 14, daysAgoEnd: null, multiplierBps: 10_000 },
];

// Simulates a classic pre-festival price spike 10 days ago followed by a "fake discount" back to normal
const PRE_SALE_HIKE_TRAJECTORY: HistoricalPoint[] = [
  { daysAgoStart: 90, daysAgoEnd: 25, multiplierBps: 9_850 },
  { daysAgoStart: 25, daysAgoEnd: 12, multiplierBps: 9_900 },
  { daysAgoStart: 12, daysAgoEnd: 3, multiplierBps: 11_150 },
  { daysAgoStart: 3, daysAgoEnd: null, multiplierBps: 10_000 },
];

const isoDaysAgo = (anchorMs: number, daysAgo: number): string => {
  return new Date(anchorMs - daysAgo * 24 * 60 * 60 * 1000).toISOString();
};

const roundToNearestTenRupees = (paise: number): number => {
  return Math.round(paise / 1_000) * 1_000;
};

const buildOfferSpans = (offer: RawRetailerOffer, anchorMs: number): PriceSpan[] => {
  const { id, retailerId, basePricePaise, priceRules, inStock, mpn } = offer;
  const trajectory = mpn === '83DV007GIN' ? PRE_SALE_HIKE_TRAJECTORY : DEFAULT_TRAJECTORY;

  return trajectory.map((point, index) => {
    const { daysAgoStart, daysAgoEnd, multiplierBps } = point;
    const stepBase =
      daysAgoEnd === null ? basePricePaise : roundToNearestTenRupees((basePricePaise * multiplierBps) / 10_000);
    const breakdown = calculateEffectivePrice(stepBase, priceRules);
    const { unconditionalPricePaise, bestConditionalPricePaise } = breakdown;
    const validFrom = isoDaysAgo(anchorMs, daysAgoStart);
    const endedAt = daysAgoEnd === null ? null : isoDaysAgo(anchorMs, daysAgoEnd);
    const lastVerifiedAt = endedAt ?? new Date(anchorMs).toISOString();

    return {
      id: `seed-span-${id}-${index}`,
      offerId: id,
      retailerId,
      basePricePaise: stepBase,
      unconditionalPricePaise,
      bestConditionalPricePaise,
      inStock,
      validFrom,
      lastVerifiedAt,
      endedAt,
    };
  });
};

export const buildInitialSeedSpans = (anchorIso = '2026-11-04T00:30:00.000Z'): PriceSpan[] => {
  const anchorMs = Date.parse(anchorIso);

  return INDIA_SEED_OFFERS.flatMap(offer => {
    return buildOfferSpans(offer, anchorMs);
  });
};

