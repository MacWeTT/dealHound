import 'server-only';

import { z } from 'zod';

import { detectCategory, detectCondition } from '@/domain/spec-extractor';
import type { PriceRule, RawRetailerOffer } from '@/domain/types';
import { mapMerchantSourceToId } from '@/server/acquisition/retailer-meta';

const serperItemSchema = z.object({
  title: z.string(),
  source: z.string().default('Indian Store'),
  link: z.string().url(),
  price: z.string(),
  delivery: z.string().optional(),
  imageUrl: z.string().optional(),
  productId: z.string().optional(),
});

const serperPayloadSchema = z.object({
  shopping: z.array(serperItemSchema).default([]),
});

const parsePriceTextToPaise = (priceText: string): number | null => {
  const cleaned = priceText.replace(/[^0-9.]/g, '');
  const rupees = Number(cleaned);

  if (!Number.isFinite(rupees) || rupees <= 0) {
    return null;
  }

  return Math.round(rupees * 100);
};

const parseDeliveryFeeRule = (deliveryText: string | undefined, itemId: string): PriceRule[] => {
  if (!deliveryText || /free/i.test(deliveryText)) {
    return [];
  }

  const feeMatch = deliveryText.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i);

  if (!feeMatch) {
    return [];
  }

  const rupees = Number(feeMatch[1].replace(/,/g, ''));

  if (!Number.isFinite(rupees) || rupees <= 0) {
    return [];
  }

  return [
    {
      id: `ship-${itemId}`,
      kind: 'shipping_fee',
      exclusivityGroup: 'mandatory_fee',
      label: 'Delivery Charge',
      amountPaise: Math.round(rupees * 100),
    },
  ];
};

export const parseSerperShoppingResponse = (rawJson: unknown, verifiedAtIso: string): RawRetailerOffer[] => {
  const parsed = serperPayloadSchema.safeParse(rawJson);

  if (!parsed.success) {
    return [];
  }

  const offers: RawRetailerOffer[] = [];

  for (const item of parsed.data.shopping) {
    const { title, source, link, price, delivery, imageUrl, productId } = item;
    const basePricePaise = parsePriceTextToPaise(price);

    if (basePricePaise === null) {
      continue;
    }

    const { id: retailerId, displayName: retailerName } = mapMerchantSourceToId(source);
    const externalId = productId ?? Buffer.from(link).toString('base64url').slice(0, 14);
    const offerId = `serper-${retailerId}-${externalId}`;

    offers.push({
      id: offerId,
      retailerId,
      retailerName,
      externalId,
      rawTitle: title,
      canonicalUrl: link,
      imageUrl,
      basePricePaise,
      inStock: true,
      condition: detectCondition(title),
      category: detectCategory(title),
      priceRules: parseDeliveryFeeRule(delivery, externalId),
      lastVerifiedAt: verifiedAtIso,
    });
  }

  return offers;
};

export const discoverViaSerperIndia = async (query: string): Promise<RawRetailerOffer[]> => {
  const apiKey = process.env.SERPER_API_KEY?.trim();

  if (!apiKey || !query.trim()) {
    return [];
  }

  try {
    const response = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: 'in',
        hl: 'en',
        num: 20,
      }),
      signal: AbortSignal.timeout(4500),
    });

    if (!response.ok) {
      return [];
    }

    const json = (await response.json()) as unknown;

    return parseSerperShoppingResponse(json, new Date().toISOString());
  } catch {
    return [];
  }
};

