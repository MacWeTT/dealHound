import 'server-only';

import { detectCategory, detectCondition } from '@/domain/spec-extractor';
import type { IndianRetailerId, RawRetailerOffer } from '@/domain/types';
import { RETAILER_DISPLAY_NAMES } from '@/server/acquisition/retailer-meta';

const PRIVATE_HOST_REGEX =
  /^(?:localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[?::1\]?|\[?fc00:|\[?fe80:)$/i;

export const isSafePublicProductUrl = (rawUrl: string): boolean => {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  const { protocol, hostname } = parsed;

  if (protocol !== 'https:') {
    return false;
  }

  if (!hostname.includes('.') || PRIVATE_HOST_REGEX.test(hostname)) {
    return false;
  }

  return true;
};

const parseMoneyToPaise = (raw: unknown): number | null => {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.round(raw * 100);
  }

  if (typeof raw !== 'string') {
    return null;
  }

  const cleaned = raw.replace(/[^0-9.]/g, '');
  const numeric = Number(cleaned);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.round(numeric * 100);
};

const flattenJsonLdNodes = (node: unknown): Array<Record<string, unknown>> => {
  if (!node || typeof node !== 'object') {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(entry => {
      return flattenJsonLdNodes(entry);
    });
  }

  const record = node as Record<string, unknown>;
  const graph = record['@graph'];

  if (Array.isArray(graph)) {
    return [record, ...flattenJsonLdNodes(graph)];
  }

  return [record];
};

const isProductNode = (node: Record<string, unknown>): boolean => {
  const rawType = node['@type'];

  if (typeof rawType === 'string') {
    return rawType.toLowerCase().includes('product');
  }

  if (Array.isArray(rawType)) {
    return rawType.some(item => {
      return typeof item === 'string' && item.toLowerCase().includes('product');
    });
  }

  return false;
};

const readMetaTag = (html: string, key: string): string | undefined => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
  );

  return match?.[1]?.trim();
};

export const extractOfferFromHtml = (
  html: string,
  canonicalUrl: string,
  retailerId: IndianRetailerId,
  verifiedAtIso: string,
): RawRetailerOffer | null => {
  const scriptMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  let productNode: Record<string, unknown> | undefined;

  for (const match of scriptMatches) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;
      const found = flattenJsonLdNodes(parsed).find(isProductNode);

      if (found) {
        productNode = found;
        break;
      }
    } catch {
      // Malformed JSON-LD block on page; continue scanning remaining blocks.
    }
  }

  const {
    name: nodeName,
    offers: rawOffers,
    image: rawImage,
    mpn: nodeMpn,
    gtin13: nodeGtin13,
    gtin: nodeGtin,
    sku: nodeSku,
  } = productNode ?? {};

  const rawName = (typeof nodeName === 'string' ? nodeName : undefined) ?? readMetaTag(html, 'og:title');

  if (!rawName) {
    return null;
  }

  const offerRecord = Array.isArray(rawOffers)
    ? (rawOffers[0] as Record<string, unknown> | undefined)
    : (rawOffers as Record<string, unknown> | undefined);
  const { price: nodePrice, lowPrice: nodeLowPrice, availability: nodeAvailability } = offerRecord ?? {};

  const rawPrice = nodePrice ?? nodeLowPrice ?? readMetaTag(html, 'product:price:amount') ?? undefined;
  const basePricePaise = parseMoneyToPaise(rawPrice);

  if (basePricePaise === null) {
    return null;
  }

  const availabilityStr = typeof nodeAvailability === 'string' ? nodeAvailability : '';
  const inStock = availabilityStr ? !/outofstock|soldout|discontinued/i.test(availabilityStr) : true;

  let imageUrl: string | undefined;

  if (typeof rawImage === 'string') {
    imageUrl = rawImage;
  } else if (Array.isArray(rawImage) && typeof rawImage[0] === 'string') {
    imageUrl = rawImage[0];
  } else {
    imageUrl = readMetaTag(html, 'og:image');
  }

  const mpn = typeof nodeMpn === 'string' ? nodeMpn.trim().toUpperCase() : undefined;
  const gtin =
    (typeof nodeGtin13 === 'string' ? nodeGtin13 : undefined) ?? (typeof nodeGtin === 'string' ? nodeGtin : undefined);
  const sku = typeof nodeSku === 'string' ? nodeSku : canonicalUrl;

  return {
    id: `live-${retailerId}-${Buffer.from(canonicalUrl).toString('base64url').slice(0, 14)}`,
    retailerId,
    retailerName: RETAILER_DISPLAY_NAMES[retailerId],
    externalId: sku,
    rawTitle: rawName.trim(),
    canonicalUrl,
    imageUrl,
    basePricePaise,
    inStock,
    condition: detectCondition(rawName),
    mpn,
    gtin,
    category: detectCategory(rawName),
    priceRules: [],
    lastVerifiedAt: verifiedAtIso,
  };
};

export const fetchOfferFromUrl = async (
  canonicalUrl: string,
  retailerId: IndianRetailerId,
): Promise<RawRetailerOffer | null> => {
  if (!isSafePublicProductUrl(canonicalUrl)) {
    return null;
  }

  try {
    const response = await fetch(canonicalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; dealHoundBot/1.0; +https://dealhound.in)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(4500),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    return extractOfferFromHtml(html, canonicalUrl, retailerId, new Date().toISOString());
  } catch {
    return null;
  }
};
