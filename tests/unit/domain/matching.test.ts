import { describe, expect, it } from 'vitest';

import { groupRetailerOffers, matchesSpecFilter } from '@/domain/matching';
import type { RawRetailerOffer } from '@/domain/types';

const makeOffer = (overrides: Partial<RawRetailerOffer>): RawRetailerOffer => {
  return {
    id: 'offer-default',
    retailerId: 'amazon-in',
    retailerName: 'Amazon.in',
    externalId: 'B0DEFAULT1',
    rawTitle: 'Default Laptop',
    canonicalUrl: 'https://www.amazon.in/dp/B0DEFAULT1',
    basePricePaise: 9_000_000,
    inStock: true,
    condition: 'new',
    priceRules: [],
    lastVerifiedAt: '2026-11-04T00:00:00.000Z',
    ...overrides,
  };
};

describe('groupRetailerOffers & matchesSpecFilter', () => {
  it('merges identical laptops across Amazon.in, Flipkart, and MDComputers while vetoing RTX 5050, refurbished, and chargers', () => {
    const offers: RawRetailerOffer[] = [
      makeOffer({
        id: 'amz-5060',
        retailerId: 'amazon-in',
        retailerName: 'Amazon.in',
        rawTitle:
          'ASUS TUF Gaming A15 (2026), 15.6" FHD 144Hz, AMD Ryzen 7 8845HS, Gaming Laptop (16GB DDR5/1TB SSD/NVIDIA GeForce RTX 5060 8GB/FA507NV-LP082W)',
        basePricePaise: 9_199_000,
        priceRules: [
          {
            id: 'hdfc-4500',
            kind: 'bank_instant_flat',
            exclusivityGroup: 'payment_offer',
            label: '₹4,500 off on HDFC CC',
            amountPaise: 450_000,
            paymentInstrument: 'hdfc-cc',
          },
        ],
      }),
      makeOffer({
        id: 'fk-5060',
        retailerId: 'flipkart',
        retailerName: 'Flipkart',
        rawTitle:
          'ASUS TUF Gaming A15 AMD Ryzen 7 Octa Core 8845HS - (16 GB/1 TB SSD/Windows 11 Home/8 GB Graphics/NVIDIA GeForce RTX 5060/144 Hz) FA507NV-LP082W Gaming Laptop',
        basePricePaise: 9_099_000,
        priceRules: [
          {
            id: 'fk-fee',
            kind: 'platform_fee',
            exclusivityGroup: 'mandatory_fee',
            label: 'Protect Promise Fee',
            amountPaise: 9_900,
          },
        ],
      }),
      makeOffer({
        id: 'mdc-5060',
        retailerId: 'mdcomputers',
        retailerName: 'MDComputers',
        rawTitle: 'Asus TUF Gaming A15 FA507NV-LP082W (Ryzen 7 8845HS / 16GB DDR5 / 1TB SSD / RTX 5060 8GB)',
        basePricePaise: 8_949_000,
      }),
      makeOffer({
        id: 'amz-5050-variant',
        retailerId: 'amazon-in',
        retailerName: 'Amazon.in',
        rawTitle:
          'ASUS TUF Gaming A15 (2026), 15.6" FHD 144Hz, AMD Ryzen 7 8845HS, Gaming Laptop (16GB DDR5/512GB SSD/NVIDIA GeForce RTX 5050 8GB/FA507NU-LP082W)',
        basePricePaise: 7_799_000,
      }),
      makeOffer({
        id: 'amz-renewed',
        retailerId: 'amazon-in',
        retailerName: 'Amazon.in',
        rawTitle: '(Renewed) ASUS TUF Gaming A15 Ryzen 7 8845HS 16GB 1TB SSD RTX 5060 FA507NV-LP082W',
        condition: 'refurbished',
        basePricePaise: 7_499_000,
      }),
      makeOffer({
        id: 'charger-scam',
        retailerId: 'flipkart',
        retailerName: 'Flipkart',
        rawTitle: '240W Charger Power Adapter for ASUS TUF Gaming A15 RTX 5060 FA507NV-LP082W',
        basePricePaise: 249_900,
      }),
    ];

    const groups = groupRetailerOffers(offers);

    // 3 groups: new RTX 5060, new RTX 5050, refurbished RTX 5060; charger excluded completely
    expect(groups).toHaveLength(3);

    const tuf5060New = groups.find(group => {
      return group.specs.mpn === 'FA507NV-LP082W' && group.specs.condition === 'new';
    });

    expect(tuf5060New).toBeDefined();

    if (tuf5060New) {
      expect(tuf5060New.offers).toHaveLength(3);
      // MDComputers wins Everyone's Price at ₹89,490; Amazon.in wins Best Card Price at ₹91,990 - ₹4,500 = ₹87,490!
      expect(tuf5060New.bestUnconditionalOffer.retailerId).toBe('mdcomputers');
      expect(tuf5060New.bestUnconditionalOffer.pricing.unconditionalPricePaise).toBe(8_949_000);
      expect(tuf5060New.bestConditionalOffer.retailerId).toBe('amazon-in');
      expect(tuf5060New.bestConditionalOffer.pricing.bestConditionalPricePaise).toBe(8_749_000);
    }
  });

  it('merges offers via structured spec fingerprint even when one retailer omits the MPN', () => {
    const offers: RawRetailerOffer[] = [
      makeOffer({
        id: 'croma-loq',
        retailerId: 'croma',
        retailerName: 'Croma',
        rawTitle: 'Lenovo LOQ Intel Core i7-13650HX Gaming Laptop (24GB DDR5, 512GB SSD, NVIDIA GeForce RTX 5060 8GB)',
        basePricePaise: 9_699_000,
      }),
      makeOffer({
        id: 'vs-loq',
        retailerId: 'vijay-sales',
        retailerName: 'Vijay Sales',
        rawTitle: 'Lenovo LOQ 83DV007GIN Gaming Laptop Core i7 13650HX / 24GB RAM / 512GB SSD / RTX 5060 8GB Graphics',
        basePricePaise: 9_499_000,
      }),
    ];

    const groups = groupRetailerOffers(offers);

    expect(groups).toHaveLength(1);
    expect(groups[0].offers).toHaveLength(2);
    expect(groups[0].bestUnconditionalOffer.retailerId).toBe('vijay-sales');
  });

  it('evaluates spec filters and budget thresholds accurately for search and spec watches', () => {
    const groups = groupRetailerOffers([
      makeOffer({
        id: 'loq-24',
        rawTitle: 'Lenovo LOQ Core i7-13650HX 24GB DDR5 512GB SSD RTX 5060 8GB',
        basePricePaise: 9_399_000,
      }),
      makeOffer({
        id: 'victus-5050',
        rawTitle: 'HP Victus Ryzen 5 8645HS 16GB DDR5 512GB SSD RTX 5050 8GB',
        basePricePaise: 7_299_000,
      }),
    ]);

    const matching = groups.filter(group => {
      return matchesSpecFilter(group, { gpu: 'rtx 5060', ramGb: 16, condition: 'new' }, 9_500_000);
    });

    expect(matching).toHaveLength(1);
    expect(matching[0].specs.brand).toBe('lenovo');
  });
});

