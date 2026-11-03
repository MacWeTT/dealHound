import { detectCategory, extractSpecsFromText } from '@/domain/spec-extractor';
import type { IndianRetailerId, ParsedSearchInput } from '@/domain/types';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'tag',
  'linkCode',
  'linkId',
  'ref',
  'ref_',
  'th',
  'psc',
  'affid',
  'affExtParam1',
  'affExtParam2',
  'cmpid',
  'gclid',
  'fbclid',
]);

const identifyIndianRetailer = (hostname: string): IndianRetailerId => {
  const host = hostname.toLowerCase().replace(/^www\./, '');

  if (host === 'amazon.in' || host === 'amzn.in') {
    return 'amazon-in';
  }

  if (host.endsWith('flipkart.com')) {
    return 'flipkart';
  }

  if (host.endsWith('croma.com')) {
    return 'croma';
  }

  if (host.endsWith('vijaysales.com')) {
    return 'vijay-sales';
  }

  if (host.endsWith('reliancedigital.in')) {
    return 'reliance-digital';
  }

  if (host.endsWith('mdcomputers.in')) {
    return 'mdcomputers';
  }

  if (host.endsWith('vedantcomputers.com')) {
    return 'vedant-computers';
  }

  if (host.endsWith('primeabgb.com')) {
    return 'primeabgb';
  }

  if (host.endsWith('lenovo.com')) {
    return 'lenovo-in';
  }

  if (host.endsWith('asus.com')) {
    return 'asus-in';
  }

  return 'external-in';
};

const parseBudgetInPaise = (raw: string): { maxBudgetPaise?: number; withoutBudget: string } => {
  const lakhMatch = raw.match(
    /\b(?:under|below|max|upto|up\s+to|<=?)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)\b/i,
  );

  if (lakhMatch) {
    const rupees = Math.round(Number(lakhMatch[1]) * 100_000);

    return {
      maxBudgetPaise: rupees * 100,
      withoutBudget: raw.replace(lakhMatch[0], ' '),
    };
  }

  const kMatch = raw.match(/\b(?:under|below|max|upto|up\s+to|<=?)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*k\b/i);

  if (kMatch) {
    const rupees = Math.round(Number(kMatch[1]) * 1_000);

    return {
      maxBudgetPaise: rupees * 100,
      withoutBudget: raw.replace(kMatch[0], ' '),
    };
  }

  const rupeeMatch = raw.match(/\b(?:under|below|max|upto|up\s+to|<=?)\s*(?:₹|rs\.?|inr)?\s*([\d,]{4,9})\b/i);

  if (rupeeMatch) {
    const rupees = Number(rupeeMatch[1].replace(/,/g, ''));

    return {
      maxBudgetPaise: rupees * 100,
      withoutBudget: raw.replace(rupeeMatch[0], ' '),
    };
  }

  return { withoutBudget: raw };
};

const parseUrlInput = (trimmed: string): ParsedSearchInput | null => {
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return null;
  }

  const { hostname, pathname, searchParams, origin } = parsedUrl;
  const retailerId = identifyIndianRetailer(hostname);

  if (retailerId === 'amazon-in') {
    const asinMatch = pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);

    if (asinMatch) {
      const asin = asinMatch[1].toUpperCase();

      return {
        kind: 'url',
        raw: trimmed,
        canonicalUrl: `https://www.amazon.in/dp/${asin}`,
        retailerId,
        externalId: asin,
      };
    }
  }

  const cleanParams = new URLSearchParams();

  searchParams.forEach((value, key) => {
    if (!TRACKING_PARAMS.has(key)) {
      cleanParams.set(key, value);
    }
  });

  const cleanPath = pathname.replace(/\/ref=[^/]+$/i, '');
  const querySuffix = cleanParams.toString();
  const canonicalUrl = querySuffix ? `${origin}${cleanPath}?${querySuffix}` : `${origin}${cleanPath}`;

  let externalId: string | undefined;

  if (retailerId === 'flipkart') {
    const pid = cleanParams.get('pid');
    const itmMatch = cleanPath.match(/\/p\/(itm[a-z0-9]+)/i);

    externalId = pid ?? itmMatch?.[1];
  }

  return {
    kind: 'url',
    raw: trimmed,
    canonicalUrl,
    retailerId,
    externalId,
  };
};

export const parseSearchInput = (input: string): ParsedSearchInput => {
  const trimmed = input.trim();
  const asUrl = parseUrlInput(trimmed);

  if (asUrl) {
    return asUrl;
  }

  const { maxBudgetPaise, withoutBudget } = parseBudgetInPaise(trimmed);
  const specs = extractSpecsFromText(withoutBudget);
  const category = detectCategory(withoutBudget);
  const normalizedQuery = withoutBudget.replace(/\s+/g, ' ').trim();

  return {
    kind: 'query',
    raw: trimmed,
    normalizedQuery,
    category,
    specs,
    maxBudgetPaise,
  };
};
