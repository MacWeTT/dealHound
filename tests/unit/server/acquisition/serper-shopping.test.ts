import { describe, expect, it } from 'vitest';

import { parseSerperShoppingResponse } from '@/server/acquisition/serper-shopping';

describe('parseSerperShoppingResponse', () => {
  it('maps Google Shopping India items into Indian retailer offers with delivery fees in paise', () => {
    const rawPayload = {
      shopping: [
        {
          title: 'Lenovo LOQ Intel Core i7-13650HX 24GB DDR5 512GB SSD RTX 5060 8GB 83DV007GIN',
          source: 'Croma',
          link: 'https://www.croma.com/lenovo-loq-83dv007gin/p/308991',
          price: '₹94,990',
          delivery: 'Free delivery',
          imageUrl: 'https://media.croma.com/loq.png',
          productId: 'croma-308991',
        },
        {
          title: 'Lenovo LOQ 83DV007GIN Core i7-13650HX 24GB 512GB SSD RTX 5060',
          source: 'Flipkart',
          link: 'https://www.flipkart.com/lenovo-loq/p/itm83dv007',
          price: '₹93,990.00',
          delivery: '₹99 delivery',
          productId: 'fk-83dv007',
        },
      ],
    };

    const offers = parseSerperShoppingResponse(rawPayload, '2026-11-04T01:00:00.000Z');

    expect(offers).toHaveLength(2);
    expect(offers[0].retailerId).toBe('croma');
    expect(offers[0].basePricePaise).toBe(9_499_000);
    expect(offers[0].priceRules).toHaveLength(0);

    expect(offers[1].retailerId).toBe('flipkart');
    expect(offers[1].basePricePaise).toBe(9_399_000);
    expect(offers[1].priceRules).toHaveLength(1);
    expect(offers[1].priceRules[0].amountPaise).toBe(9_900);
  });
});

