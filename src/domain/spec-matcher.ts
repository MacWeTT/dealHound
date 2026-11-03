import type { CanonicalProductGroup, ProductSpecs } from '@/domain/types';

export const mergeSpecs = (base: ProductSpecs, incoming: ProductSpecs): ProductSpecs => {
  const {
    brand: baseBrand,
    series: baseSeries,
    mpn: baseMpn,
    gtin: baseGtin,
    cpu: baseCpu,
    gpu: baseGpu,
    vramGb: baseVram,
    ramGb: baseRam,
    storageGb: baseStorage,
    condition: baseCond,
  } = base;
  const {
    brand: incBrand,
    series: incSeries,
    mpn: incMpn,
    gtin: incGtin,
    cpu: incCpu,
    gpu: incGpu,
    vramGb: incVram,
    ramGb: incRam,
    storageGb: incStorage,
    condition: incCond,
  } = incoming;

  return {
    brand: baseBrand ?? incBrand,
    series: baseSeries ?? incSeries,
    mpn: baseMpn ?? incMpn,
    gtin: baseGtin ?? incGtin,
    cpu: baseCpu ?? incCpu,
    gpu: baseGpu ?? incGpu,
    vramGb: baseVram ?? incVram,
    ramGb: baseRam ?? incRam,
    storageGb: baseStorage ?? incStorage,
    condition: baseCond ?? incCond,
  };
};

const conflictsOnDefined = <T>(left: T | undefined, right: T | undefined): boolean => {
  return left !== undefined && right !== undefined && left !== right;
};

export const hasHardSpecConflict = (left: ProductSpecs, right: ProductSpecs): boolean => {
  const {
    condition: leftCond = 'new',
    mpn: leftMpn,
    gtin: leftGtin,
    brand: leftBrand,
    series: leftSeries,
    gpu: leftGpu,
    cpu: leftCpu,
    ramGb: leftRam,
    storageGb: leftStorage,
  } = left;
  const {
    condition: rightCond = 'new',
    mpn: rightMpn,
    gtin: rightGtin,
    brand: rightBrand,
    series: rightSeries,
    gpu: rightGpu,
    cpu: rightCpu,
    ramGb: rightRam,
    storageGb: rightStorage,
  } = right;

  if (leftCond !== rightCond) {
    return true;
  }

  return (
    conflictsOnDefined(leftGtin, rightGtin) ||
    conflictsOnDefined(leftMpn, rightMpn) ||
    conflictsOnDefined(leftBrand, rightBrand) ||
    conflictsOnDefined(leftSeries, rightSeries) ||
    conflictsOnDefined(leftGpu, rightGpu) ||
    conflictsOnDefined(leftCpu, rightCpu) ||
    conflictsOnDefined(leftRam, rightRam) ||
    conflictsOnDefined(leftStorage, rightStorage)
  );
};

export const computeSpecConfidence = (left: ProductSpecs, right: ProductSpecs): number => {
  if (hasHardSpecConflict(left, right)) {
    return 0;
  }

  const {
    gtin: leftGtin,
    mpn: leftMpn,
    brand: leftBrand,
    series: leftSeries,
    cpu: leftCpu,
    gpu: leftGpu,
    ramGb: leftRam,
  } = left;
  const {
    gtin: rightGtin,
    mpn: rightMpn,
    brand: rightBrand,
    series: rightSeries,
    cpu: rightCpu,
    gpu: rightGpu,
    ramGb: rightRam,
  } = right;

  if ((leftGtin && leftGtin === rightGtin) || (leftMpn && leftMpn === rightMpn)) {
    return 1;
  }

  if (!leftBrand || leftBrand !== rightBrand) {
    return 0;
  }

  let sharedCoreSpecs = 0;

  if (leftCpu && leftCpu === rightCpu) {
    sharedCoreSpecs += 1;
  }

  if (leftGpu && leftGpu === rightGpu) {
    sharedCoreSpecs += 1;
  }

  if (leftRam !== undefined && leftRam === rightRam) {
    sharedCoreSpecs += 1;
  }

  if (leftSeries && leftSeries === rightSeries && (sharedCoreSpecs >= 2 || (!leftCpu && !leftGpu))) {
    return 0.92;
  }

  if (sharedCoreSpecs >= 3) {
    return 0.88;
  }

  return 0;
};

export const matchesSpecFilter = (
  group: CanonicalProductGroup,
  filterSpecs: ProductSpecs,
  maxBudgetPaise?: number,
  keywordQuery?: string,
): boolean => {
  const { specs, canonicalTitle, offers, bestConditionalOffer } = group;
  const {
    condition: actualCond = 'new',
    brand: actualBrand,
    mpn: actualMpn,
    gpu: actualGpu,
    cpu: actualCpu,
    ramGb: actualRam,
    storageGb: actualStorage,
  } = specs;
  const {
    brand: reqBrand,
    mpn: reqMpn,
    gpu: reqGpu,
    cpu: reqCpu,
    ramGb: reqRam,
    storageGb: reqStorage,
    condition: reqCondition,
  } = filterSpecs;

  if (reqCondition && actualCond !== reqCondition) {
    return false;
  }

  if (reqBrand && actualBrand !== reqBrand) {
    return false;
  }

  if (reqMpn && actualMpn !== reqMpn.toUpperCase()) {
    return false;
  }

  if (reqGpu && actualGpu !== reqGpu) {
    return false;
  }

  if (reqCpu && (!actualCpu || !actualCpu.includes(reqCpu))) {
    return false;
  }

  if (reqRam !== undefined && (actualRam === undefined || actualRam < reqRam)) {
    return false;
  }

  if (reqStorage !== undefined && (actualStorage === undefined || actualStorage < reqStorage)) {
    return false;
  }

  if (maxBudgetPaise !== undefined && bestConditionalOffer.pricing.bestConditionalPricePaise > maxBudgetPaise) {
    return false;
  }

  if (keywordQuery) {
    const rawTitles = offers
      .map(item => {
        return item.rawTitle;
      })
      .join(' ');
    const haystack = `${canonicalTitle} ${rawTitles}`.toLowerCase();
    const tokens = keywordQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(token => {
        return token.length >= 2 && !['gb', 'tb', 'ssd', 'ram', 'laptop', 'gaming', 'with', 'for'].includes(token);
      });

    for (const token of tokens) {
      if (!haystack.includes(token)) {
        return false;
      }
    }
  }

  return true;
};
