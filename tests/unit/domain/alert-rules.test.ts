import { describe, expect, it } from 'vitest';

import { evaluateWatchRule } from '@/domain/alert-rules';
import type { WatchRule } from '@/domain/types';

const makeWatch = (overrides: Partial<WatchRule> = {}): WatchRule => {
  return {
    id: 'watch-1',
    label: 'ASUS TUF A15 RTX 5060',
    productSlug: 'asus-fa507nv-lp082w-new',
    triggerMode: 'target_price',
    priceBasis: 'unconditional',
    baselinePricePaise: 9_199_000,
    targetPricePaise: 8_700_000,
    lastAlertedPricePaise: null,
    lastAlertedAt: null,
    aboveRearmSince: null,
    state: 'armed',
    discordWebhookUrl: 'https://discord.com/api/webhooks/123456789012345678/validToken_abc123',
    walletInstruments: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
};

describe('evaluateWatchRule', () => {
  it('respects priceBasis so card-gated discounts do not trigger an unconditional watch', () => {
    const unconditionalWatch = makeWatch({ priceBasis: 'unconditional', targetPricePaise: 8_700_000 });
    const cardWatch = makeWatch({ priceBasis: 'best_conditional', targetPricePaise: 8_700_000 });

    const candidate = {
      inStock: true,
      unconditionalPricePaise: 8_999_000,
      bestConditionalPricePaise: 8_549_000,
      allTimeLowPaise: 8_549_000,
      nowIso: '2026-11-04T06:00:00.000Z',
    };

    const uncondEval = evaluateWatchRule(unconditionalWatch, candidate);
    const cardEval = evaluateWatchRule(cardWatch, candidate);

    expect(uncondEval.shouldAlert).toBe(false);
    expect(cardEval.shouldAlert).toBe(true);
    expect(cardEval.nextState).toBe('triggered');
    expect(cardEval.nextLastAlertedPricePaise).toBe(8_549_000);
  });

  it('suppresses repeat spam on flat/minor dips when triggered, fires on >=2% deeper low, and re-arms after 48h rebound', () => {
    const triggeredWatch = makeWatch({
      priceBasis: 'best_conditional',
      targetPricePaise: 8_700_000,
      state: 'triggered',
      lastAlertedPricePaise: 8_549_000,
      lastAlertedAt: '2026-11-01T00:00:00.000Z',
    });

    const flatEval = evaluateWatchRule(triggeredWatch, {
      inStock: true,
      unconditionalPricePaise: 8_999_000,
      bestConditionalPricePaise: 8_549_000,
      allTimeLowPaise: 8_549_000,
      nowIso: '2026-11-02T02:00:00.000Z',
    });

    expect(flatEval.shouldAlert).toBe(false);
    expect(flatEval.nextState).toBe('triggered');

    const deeperDropEval = evaluateWatchRule(triggeredWatch, {
      inStock: true,
      unconditionalPricePaise: 8_699_000,
      bestConditionalPricePaise: 8_299_000,
      allTimeLowPaise: 8_299_000,
      nowIso: '2026-11-02T08:00:00.000Z',
    });

    expect(deeperDropEval.shouldAlert).toBe(true);
    expect(deeperDropEval.nextLastAlertedPricePaise).toBe(8_299_000);

    // Price rebounds above ₹87,000 + 3% hysteresis (₹89,610) at T0 -> starts rearm timer
    const reboundStart = evaluateWatchRule(triggeredWatch, {
      inStock: true,
      unconditionalPricePaise: 9_299_000,
      bestConditionalPricePaise: 9_099_000,
      allTimeLowPaise: 8_549_000,
      nowIso: '2026-11-03T00:00:00.000Z',
    });

    expect(reboundStart.shouldAlert).toBe(false);
    expect(reboundStart.nextState).toBe('triggered');
    expect(reboundStart.nextAboveRearmSince).toBe('2026-11-03T00:00:00.000Z');

    // Sustained > 48h above hysteresis ceiling -> re-arms cleanly back to 'armed'!
    const rearmed = evaluateWatchRule(
      { ...triggeredWatch, aboveRearmSince: reboundStart.nextAboveRearmSince },
      {
        inStock: true,
        unconditionalPricePaise: 9_299_000,
        bestConditionalPricePaise: 9_099_000,
        allTimeLowPaise: 8_549_000,
        nowIso: '2026-11-05T02:00:00.000Z',
      },
    );

    expect(rearmed.shouldAlert).toBe(false);
    expect(rearmed.nextState).toBe('armed');
    expect(rearmed.nextAboveRearmSince).toBeNull();
  });
});

