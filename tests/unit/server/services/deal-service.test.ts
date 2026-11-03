import { describe, expect, it, vi } from 'vitest';

import { createDealService } from '@/server/services/deal-service';
import { createInMemoryDealStore } from '@/server/store/deal-store';

describe('deal-service end-to-end (India)', () => {
  it('searches RTX 5060 laptops across Indian retailers and resolves pasted Amazon.in URLs to cross-store comparisons', async () => {
    const store = createInMemoryDealStore();
    const service = createDealService({ store });

    const queryResult = await service.searchDeals('RTX 5060 laptop under 95k', {
      instruments: ['hdfc-cc'],
    });

    expect(queryResult.groups.length).toBeGreaterThanOrEqual(2);
    expect(queryResult.groups[0].offers.length).toBeGreaterThanOrEqual(2);

    const urlResult = await service.searchDeals('https://www.amazon.in/dp/B0DF5060NV?tag=affiliate-21');

    expect(urlResult.parsedInput.kind).toBe('url');
    expect(urlResult.groups.length).toBeGreaterThanOrEqual(1);
    expect(urlResult.groups[0].specs.mpn).toBe('FA507NV-LP082W');
    expect(urlResult.groups[0].offers.length).toBeGreaterThanOrEqual(3);
  });

  it('creates a Discord watch, triggers a single Discord embed on price drop, and suppresses flat-price spam', async () => {
    const store = createInMemoryDealStore();
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const service = createDealService({ store, webhookFetch: mockFetch });

    const created = await service.createWatch({
      label: 'TUF A15 RTX 5060 <= ₹86,000',
      productSlug: 'asus-fa507nv-lp082w-new',
      triggerMode: 'target_price',
      priceBasis: 'unconditional',
      targetPricePaise: 8_600_000,
      discordWebhookUrl: 'https://discord.com/api/webhooks/123456789012345678/validToken_abc12345',
      walletInstruments: [],
    });

    expect(created.ok).toBe(true);

    // Drop MDComputers offer from ₹88,990 to ₹84,990 -> triggers Discord alert once
    const firstPoll = await service.ingestOfferPriceUpdate(
      'mdc-tuf-a15-5060',
      8_499_000,
      true,
      '2026-11-04T03:00:00.000Z',
    );

    expect(firstPoll.alertsSent).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Polling again at the exact same ₹84,990 price -> hysteresis suppresses duplicate spam
    const secondPoll = await service.ingestOfferPriceUpdate(
      'mdc-tuf-a15-5060',
      8_499_000,
      true,
      '2026-11-04T05:00:00.000Z',
    );

    expect(secondPoll.alertsSent).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

