import { describe, expect, it } from 'vitest';

import { buildStepChartGeometry, recordPriceObservation, summarizePriceHistory } from '@/domain/price-history';
import type { PriceSpan } from '@/domain/types';

describe('price-history domain', () => {
  it('extends lastVerifiedAt when price is unchanged and opens a new span when price drops', () => {
    const initial: PriceSpan[] = [
      {
        id: 'span-1',
        offerId: 'amz-5060',
        retailerId: 'amazon-in',
        basePricePaise: 9_199_000,
        unconditionalPricePaise: 9_199_000,
        bestConditionalPricePaise: 8_749_000,
        inStock: true,
        validFrom: '2026-10-01T00:00:00.000Z',
        lastVerifiedAt: '2026-10-02T00:00:00.000Z',
        endedAt: null,
      },
    ];

    const unchanged = recordPriceObservation(initial, {
      id: 'span-2',
      offerId: 'amz-5060',
      retailerId: 'amazon-in',
      basePricePaise: 9_199_000,
      unconditionalPricePaise: 9_199_000,
      bestConditionalPricePaise: 8_749_000,
      inStock: true,
      observedAt: '2026-10-05T12:00:00.000Z',
    });

    expect(unchanged).toHaveLength(1);
    expect(unchanged[0].lastVerifiedAt).toBe('2026-10-05T12:00:00.000Z');

    const dropped = recordPriceObservation(unchanged, {
      id: 'span-2',
      offerId: 'amz-5060',
      retailerId: 'amazon-in',
      basePricePaise: 8_699_000,
      unconditionalPricePaise: 8_699_000,
      bestConditionalPricePaise: 8_249_000,
      inStock: true,
      observedAt: '2026-10-10T08:00:00.000Z',
    });

    expect(dropped).toHaveLength(2);
    expect(dropped[0].endedAt).toBe('2026-10-10T08:00:00.000Z');
    expect(dropped[1].endedAt).toBeNull();
    expect(dropped[1].unconditionalPricePaise).toBe(8_699_000);
  });

  it('computes time-weighted 90d median resisting outlier spikes and flags fake pre-sale price hikes', () => {
    const hikeSpans: PriceSpan[] = [
      {
        id: 's1',
        offerId: 'fk-5060',
        retailerId: 'flipkart',
        basePricePaise: 8_999_000,
        unconditionalPricePaise: 8_999_000,
        bestConditionalPricePaise: 8_699_000,
        inStock: true,
        validFrom: '2026-09-01T00:00:00.000Z',
        lastVerifiedAt: '2026-10-25T00:00:00.000Z',
        endedAt: '2026-10-25T00:00:00.000Z',
      },
      {
        id: 's2-pre-sale-hike',
        offerId: 'fk-5060',
        retailerId: 'flipkart',
        basePricePaise: 10_199_000,
        unconditionalPricePaise: 10_199_000,
        bestConditionalPricePaise: 9_899_000,
        inStock: true,
        validFrom: '2026-10-25T00:00:00.000Z',
        lastVerifiedAt: '2026-11-02T00:00:00.000Z',
        endedAt: '2026-11-02T00:00:00.000Z',
      },
      {
        id: 's3-fake-sale',
        offerId: 'fk-5060',
        retailerId: 'flipkart',
        basePricePaise: 9_099_000,
        unconditionalPricePaise: 9_099_000,
        bestConditionalPricePaise: 8_799_000,
        inStock: true,
        validFrom: '2026-11-02T00:00:00.000Z',
        lastVerifiedAt: '2026-11-04T00:00:00.000Z',
        endedAt: null,
      },
    ];

    const summary = summarizePriceHistory(hikeSpans, '2026-11-04T00:00:00.000Z');

    expect(summary.median90dPaise).toBe(8_999_000);
    expect(summary.preSaleHikeDetected).toBe(true);
    expect(summary.verdict).toBe('inflated_hike');
  });

  it('builds horizontal-vertical SVG step geometry with ATL and target coordinates', () => {
    const spans: PriceSpan[] = [
      {
        id: 's1',
        offerId: 'mdc-5060',
        retailerId: 'mdcomputers',
        basePricePaise: 9_299_000,
        unconditionalPricePaise: 9_299_000,
        bestConditionalPricePaise: 9_299_000,
        inStock: true,
        validFrom: '2026-10-01T00:00:00.000Z',
        lastVerifiedAt: '2026-10-20T00:00:00.000Z',
        endedAt: '2026-10-20T00:00:00.000Z',
      },
      {
        id: 's2',
        offerId: 'mdc-5060',
        retailerId: 'mdcomputers',
        basePricePaise: 8_849_000,
        unconditionalPricePaise: 8_849_000,
        bestConditionalPricePaise: 8_849_000,
        inStock: true,
        validFrom: '2026-10-20T00:00:00.000Z',
        lastVerifiedAt: '2026-11-04T00:00:00.000Z',
        endedAt: null,
      },
    ];

    const chart = buildStepChartGeometry(spans, {
      nowIso: '2026-11-04T00:00:00.000Z',
      width: 600,
      height: 180,
      targetPricePaise: 8_500_000,
    });

    expect(chart.stepPath).toContain('H');
    expect(chart.stepPath).toContain('V');
    expect(chart.targetY).not.toBeNull();
    expect(chart.points.length).toBeGreaterThanOrEqual(2);
  });
});

