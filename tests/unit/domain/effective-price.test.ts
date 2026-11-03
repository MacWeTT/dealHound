import { describe, expect, it } from 'vitest';

import { calculateEffectivePrice } from '@/domain/effective-price';
import type { PriceRule } from '@/domain/types';

describe('calculateEffectivePrice', () => {
  const sampleRules: PriceRule[] = [
    {
      id: 'fee-protect',
      kind: 'platform_fee',
      exclusivityGroup: 'mandatory_fee',
      label: 'Protect Promise Fee',
      amountPaise: 9_900,
    },
    {
      id: 'coupon-2k',
      kind: 'coupon_flat',
      exclusivityGroup: 'store_coupon',
      label: 'Clip ₹2,000 Store Coupon',
      amountPaise: 200_000,
      minOrderPaise: 5_000_000,
    },
    {
      id: 'hdfc-10pct-cap',
      kind: 'bank_instant_pct',
      exclusivityGroup: 'payment_offer',
      label: '10% Instant Discount up to ₹4,500 on HDFC CC',
      rateBps: 1000,
      maxDiscountPaise: 450_000,
      minOrderPaise: 5_000_000,
      paymentInstrument: 'hdfc-cc',
    },
    {
      id: 'apay-5pct-uncapped',
      kind: 'card_cashback_pct',
      exclusivityGroup: 'payment_offer',
      label: '5% Unlimited Cashback on Amazon Pay ICICI',
      rateBps: 500,
      paymentInstrument: 'amazon-pay-icici',
    },
    {
      id: 'exchange-bonus',
      kind: 'exchange_bonus',
      exclusivityGroup: 'exchange',
      label: '₹6,000 Exchange Bump-up',
      amountPaise: 600_000,
    },
  ];

  it('computes unconditional price and picks the best mutually exclusive card offer without exchange fluff', () => {
    const breakdown = calculateEffectivePrice(9_299_000, sampleRules);

    expect(breakdown.mandatoryFeesPaise).toBe(9_900);
    expect(breakdown.storeCouponDiscountPaise).toBe(200_000);
    expect(breakdown.unconditionalPricePaise).toBe(9_108_900);

    // Net after ₹2,000 coupon on ₹92,990 is ₹90,990 -> 5% uncapped is ₹4,549.50 (454,950p) > ₹4,500 cap (450,000p)
    expect(breakdown.selectedPaymentInstrument).toBe('amazon-pay-icici');
    expect(breakdown.conditionalDiscountPaise).toBe(454_950);
    expect(breakdown.bestConditionalPricePaise).toBe(8_653_950);
  });

  it('filters conditional card offers strictly to instruments in the user wallet', () => {
    const hdfcOnly = calculateEffectivePrice(9_299_000, sampleRules, { instruments: ['hdfc-cc'] });
    const upiOnly = calculateEffectivePrice(9_299_000, sampleRules, { instruments: ['upi'] });

    expect(hdfcOnly.selectedPaymentInstrument).toBe('hdfc-cc');
    expect(hdfcOnly.conditionalDiscountPaise).toBe(450_000);
    expect(hdfcOnly.bestConditionalPricePaise).toBe(8_658_900);

    expect(upiOnly.selectedPaymentInstrument).toBeUndefined();
    expect(upiOnly.bestConditionalPricePaise).toBe(upiOnly.unconditionalPricePaise);
  });

  it('solves the Indian min-spend coupon trap by skipping a small coupon when doing so unlocks a bigger bank discount', () => {
    const minSpendTrapRules: PriceRule[] = [
      {
        id: 'coupon-1k',
        kind: 'coupon_flat',
        exclusivityGroup: 'store_coupon',
        label: '₹1,000 Store Coupon',
        amountPaise: 100_000,
      },
      {
        id: 'sbi-3k-min-30k',
        kind: 'bank_instant_flat',
        exclusivityGroup: 'payment_offer',
        label: 'Flat ₹3,000 off on SBI CC (Min ₹30,000)',
        amountPaise: 300_000,
        minOrderPaise: 3_000_000,
        paymentInstrument: 'sbi-cc',
      },
    ];

    const result = calculateEffectivePrice(3_050_000, minSpendTrapRules);

    // Everyone's price clips the ₹1,000 coupon -> ₹29,500
    expect(result.unconditionalPricePaise).toBe(2_950_000);

    // Conditional solver skips ₹1,000 coupon so cart stays ₹30,500 >= ₹30,000, unlocking ₹3,000 SBI discount -> ₹27,500!
    expect(result.bestConditionalPricePaise).toBe(2_750_000);
    expect(result.selectedPaymentInstrument).toBe('sbi-cc');
  });
});

