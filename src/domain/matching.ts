import { calculateEffectivePrice } from '@/domain/effective-price';
import { detectCategory, detectCondition, extractSpecsFromText, isAccessoryListing } from '@/domain/spec-extractor';
import { computeSpecConfidence, hasHardSpecConflict, matchesSpecFilter, mergeSpecs } from '@/domain/spec-matcher';
import type {
  CanonicalProductGroup,
  EnrichedRetailerOffer,
  ProductCategory,
  ProductSpecs,
  RawRetailerOffer,
  UserWalletProfile,
} from '@/domain/types';

export { hasHardSpecConflict, matchesSpecFilter };

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
};

const buildCanonicalTitle = (specs: ProductSpecs, fallbackTitle: string): string => {
  const { brand, series, cpu, gpu, ramGb, storageGb, mpn, condition } = specs;

  if (!brand || (!series && !gpu && !cpu)) {
    return fallbackTitle;
  }

  const titleParts: string[] = [brand.toUpperCase()];

  if (series) {
    titleParts.push(
      series
        .split(' ')
        .map(word => {
          return word.length <= 3 ? word.toUpperCase() : `${word[0].toUpperCase()}${word.slice(1)}`;
        })
        .join(' '),
    );
  }

  const configParts: string[] = [];

  if (cpu) {
    configParts.push(cpu.toUpperCase());
  }

  if (gpu) {
    configParts.push(gpu.toUpperCase());
  }

  if (ramGb !== undefined) {
    configParts.push(`${ramGb}GB`);
  }

  if (storageGb !== undefined) {
    configParts.push(storageGb >= 1024 ? `${storageGb / 1024}TB SSD` : `${storageGb}GB SSD`);
  }

  const suffix = configParts.length > 0 ? ` (${configParts.join(' / ')})` : '';
  const mpnTag = mpn ? ` [${mpn}]` : '';
  const condTag = condition && condition !== 'new' ? ` (${condition.replace('_', ' ')})` : '';

  return `${titleParts.join(' ')}${suffix}${mpnTag}${condTag}`;
};

const pickBestOffer = (
  offers: EnrichedRetailerOffer[],
  mode: 'unconditional' | 'conditional',
): EnrichedRetailerOffer => {
  const sorted = [...offers].sort((a, b) => {
    const { inStock: aStock, pricing: aPricing } = a;
    const { inStock: bStock, pricing: bPricing } = b;
    const { unconditionalPricePaise: aUncond, bestConditionalPricePaise: aCond } = aPricing;
    const { unconditionalPricePaise: bUncond, bestConditionalPricePaise: bCond } = bPricing;

    if (aStock !== bStock) {
      return aStock ? -1 : 1;
    }

    const aPrice = mode === 'unconditional' ? aUncond : aCond;
    const bPrice = mode === 'unconditional' ? bUncond : bCond;

    return aPrice - bPrice;
  });

  return sorted[0];
};

export const groupRetailerOffers = (
  rawOffers: RawRetailerOffer[],
  wallet?: UserWalletProfile,
): CanonicalProductGroup[] => {
  const enrichedOffers: EnrichedRetailerOffer[] = [];

  for (const rawOffer of rawOffers) {
    const { rawTitle, basePricePaise, priceRules, mpn, gtin, condition } = rawOffer;

    if (isAccessoryListing(rawTitle)) {
      continue;
    }

    const parsedSpecs = extractSpecsFromText(rawTitle);
    const { condition: parsedCond, mpn: parsedMpn, gtin: parsedGtin } = parsedSpecs;
    const effectiveCondition = condition !== 'new' ? condition : (parsedCond ?? detectCondition(rawTitle));
    const extractedSpecs: ProductSpecs = {
      ...parsedSpecs,
      mpn: mpn?.toUpperCase() ?? parsedMpn,
      gtin: gtin ?? parsedGtin,
      condition: effectiveCondition,
    };
    const pricing = calculateEffectivePrice(basePricePaise, priceRules, wallet);

    enrichedOffers.push({
      ...rawOffer,
      condition: effectiveCondition,
      extractedSpecs,
      pricing,
      matchConfidence: 1,
    });
  }

  interface MutableBucket {
    specs: ProductSpecs;
    category: ProductCategory;
    offers: EnrichedRetailerOffer[];
  }

  const buckets: MutableBucket[] = [];

  for (const offer of enrichedOffers) {
    const { extractedSpecs, rawTitle, category } = offer;
    let matchedIndex = -1;
    let bestConfidence = 0;

    buckets.forEach((bucket, idx) => {
      const confidence = computeSpecConfidence(bucket.specs, extractedSpecs);

      if (confidence >= 0.85 && confidence > bestConfidence) {
        bestConfidence = confidence;
        matchedIndex = idx;
      }
    });

    if (matchedIndex >= 0) {
      const target = buckets[matchedIndex];
      const { specs: prevSpecs, offers: prevOffers } = target;

      buckets[matchedIndex] = {
        ...target,
        specs: mergeSpecs(prevSpecs, extractedSpecs),
        offers: [...prevOffers, { ...offer, matchConfidence: bestConfidence }],
      };
    } else {
      buckets.push({
        specs: extractedSpecs,
        category: category ?? detectCategory(rawTitle) ?? 'electronics',
        offers: [offer],
      });
    }
  }

  const groups: CanonicalProductGroup[] = buckets.map(bucket => {
    const { specs, category, offers } = bucket;
    const sortedOffers = [...offers].sort((a, b) => {
      const { inStock: aStock, pricing: aPrice } = a;
      const { inStock: bStock, pricing: bPrice } = b;

      if (aStock !== bStock) {
        return aStock ? -1 : 1;
      }

      return aPrice.unconditionalPricePaise - bPrice.unconditionalPricePaise;
    });
    const leadOffer = sortedOffers[0];
    const { rawTitle: leadTitle, imageUrl: leadImage } = leadOffer;
    const { mpn: bucketMpn, brand: bucketBrand, condition: bucketCond } = specs;
    const canonicalTitle = buildCanonicalTitle(specs, leadTitle);
    const slugSeed = bucketMpn ? `${bucketBrand ?? 'item'}-${bucketMpn}-${bucketCond ?? 'new'}` : canonicalTitle;
    const fallbackImage = offers.find(candidate => {
      return Boolean(candidate.imageUrl);
    })?.imageUrl;

    return {
      slug: slugify(slugSeed),
      canonicalTitle,
      category,
      imageUrl: leadImage ?? fallbackImage,
      specs,
      offers: sortedOffers,
      similarOffers: [],
      bestUnconditionalOffer: pickBestOffer(sortedOffers, 'unconditional'),
      bestConditionalOffer: pickBestOffer(sortedOffers, 'conditional'),
    };
  });

  return groups.sort((a, b) => {
    return (
      a.bestUnconditionalOffer.pricing.unconditionalPricePaise -
      b.bestUnconditionalOffer.pricing.unconditionalPricePaise
    );
  });
};
