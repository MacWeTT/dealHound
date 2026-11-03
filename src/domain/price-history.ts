import type {
  DealVerdict,
  IndianRetailerId,
  PriceHistorySummary,
  PriceSpan,
  StepChartGeometry,
  StepChartPoint,
  WatchPriceBasis,
} from '@/domain/types';

export interface PriceObservationInput {
  id: string;
  offerId: string;
  retailerId: IndianRetailerId;
  basePricePaise: number;
  unconditionalPricePaise: number;
  bestConditionalPricePaise: number;
  inStock: boolean;
  observedAt: string;
}

export interface StepChartOptions {
  nowIso: string;
  width?: number;
  height?: number;
  targetPricePaise?: number;
  basis?: WatchPriceBasis;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const TWENTY_ONE_DAYS_MS = 21 * 24 * 60 * 60 * 1000;

const pickSpanPrice = (span: PriceSpan, basis: WatchPriceBasis): number => {
  const { unconditionalPricePaise, bestConditionalPricePaise } = span;

  return basis === 'best_conditional' ? bestConditionalPricePaise : unconditionalPricePaise;
};

export const recordPriceObservation = (spans: PriceSpan[], observation: PriceObservationInput): PriceSpan[] => {
  const {
    id,
    offerId,
    retailerId,
    basePricePaise,
    unconditionalPricePaise,
    bestConditionalPricePaise,
    inStock,
    observedAt,
  } = observation;

  const activeIndex = spans.findIndex(span => {
    const { offerId: spanOfferId, endedAt } = span;

    return spanOfferId === offerId && endedAt === null;
  });

  if (activeIndex === -1) {
    return [
      ...spans,
      {
        id,
        offerId,
        retailerId,
        basePricePaise,
        unconditionalPricePaise,
        bestConditionalPricePaise,
        inStock,
        validFrom: observedAt,
        lastVerifiedAt: observedAt,
        endedAt: null,
      },
    ];
  }

  const active = spans[activeIndex];
  const { unconditionalPricePaise: prevUncond, bestConditionalPricePaise: prevCond, inStock: prevStock } = active;

  if (prevUncond === unconditionalPricePaise && prevCond === bestConditionalPricePaise && prevStock === inStock) {
    return spans.map((span, idx) => {
      return idx === activeIndex ? { ...span, lastVerifiedAt: observedAt } : span;
    });
  }

  const closedSpans = spans.map((span, idx) => {
    return idx === activeIndex ? { ...span, lastVerifiedAt: observedAt, endedAt: observedAt } : span;
  });

  return [
    ...closedSpans,
    {
      id,
      offerId,
      retailerId,
      basePricePaise,
      unconditionalPricePaise,
      bestConditionalPricePaise,
      inStock,
      validFrom: observedAt,
      lastVerifiedAt: observedAt,
      endedAt: null,
    },
  ];
};

const computeTimeWeightedMedian = (spans: PriceSpan[], nowMs: number, basis: WatchPriceBasis): number => {
  const windowStart = nowMs - NINETY_DAYS_MS;
  const weighted: Array<{ price: number; durationMs: number }> = [];
  let totalDuration = 0;

  for (const span of spans) {
    const { validFrom, endedAt } = span;
    const startMs = Math.max(windowStart, Date.parse(validFrom));
    const endMs = Math.min(nowMs, endedAt ? Date.parse(endedAt) : nowMs);
    const durationMs = Math.max(1, endMs - startMs);

    if (endMs >= windowStart) {
      weighted.push({ price: pickSpanPrice(span, basis), durationMs });
      totalDuration += durationMs;
    }
  }

  const { length: weightedCount } = weighted;

  if (weightedCount === 0) {
    return pickSpanPrice(spans[spans.length - 1], basis);
  }

  weighted.sort((a, b) => {
    return a.price - b.price;
  });

  const midpoint = totalDuration / 2;
  let cumulative = 0;

  for (const slice of weighted) {
    const { price, durationMs } = slice;

    cumulative += durationMs;

    if (cumulative >= midpoint) {
      return price;
    }
  }

  return weighted[weightedCount - 1].price;
};

export const summarizePriceHistory = (
  spans: PriceSpan[],
  nowIso: string,
  basis: WatchPriceBasis = 'unconditional',
): PriceHistorySummary => {
  const sorted = [...spans].sort((a, b) => {
    return Date.parse(a.validFrom) - Date.parse(b.validFrom);
  });
  const nowMs = Date.parse(nowIso);
  const prices = sorted.map(span => {
    return pickSpanPrice(span, basis);
  });
  const currentPaise = prices[prices.length - 1];
  const allTimeLowPaise = Math.min(...prices);
  const allTimeHighPaise = Math.max(...prices);
  const median90dPaise = computeTimeWeightedMedian(sorted, nowMs, basis);
  const vsMedianBps = Math.round(((currentPaise - median90dPaise) / Math.max(1, median90dPaise)) * 10_000);

  const recentWindowStart = nowMs - TWENTY_ONE_DAYS_MS;
  const recentHigh = sorted.reduce((acc, span) => {
    const { endedAt } = span;
    const endMs = endedAt ? Date.parse(endedAt) : nowMs;

    return endMs >= recentWindowStart ? Math.max(acc, pickSpanPrice(span, basis)) : acc;
  }, currentPaise);

  const spikedAboveMedian = recentHigh >= Math.round(median90dPaise * 1.08);
  const droppedFromSpike = currentPaise < recentHigh;
  const notTrulyCheaperThanMedian = currentPaise >= Math.round(median90dPaise * 0.99);
  const preSaleHikeDetected = spikedAboveMedian && droppedFromSpike && notTrulyCheaperThanMedian;

  let verdict: DealVerdict = 'fair_price';
  let verdictReason = 'Close to its 90-day typical Indian street price.';

  if (preSaleHikeDetected) {
    verdict = 'inflated_hike';
    verdictReason = 'Price was hiked shortly before this drop — still at or above its real 90-day median.';
  } else if (currentPaise <= allTimeLowPaise && vsMedianBps <= -300) {
    verdict = 'all_time_low';
    verdictReason = 'Lowest verified price recorded across tracked history.';
  } else if (vsMedianBps <= -500) {
    verdict = 'great_deal';
    verdictReason = `${Math.abs(Math.round(vsMedianBps / 100))}% below its 90-day median street price.`;
  } else if (vsMedianBps >= 500) {
    verdict = 'above_typical';
    verdictReason = `${Math.round(vsMedianBps / 100)}% above its 90-day median — worth waiting for a drop.`;
  }

  return {
    currentPaise,
    allTimeLowPaise,
    allTimeHighPaise,
    median90dPaise,
    vsMedianBps,
    preSaleHikeDetected,
    verdict,
    verdictReason,
  };
};

export const buildStepChartGeometry = (spans: PriceSpan[], options: StepChartOptions): StepChartGeometry => {
  const { nowIso, width = 640, height = 200, targetPricePaise, basis = 'unconditional' } = options;
  const padX = 16;
  const padY = 18;
  const sorted = [...spans].sort((a, b) => {
    return Date.parse(a.validFrom) - Date.parse(b.validFrom);
  });
  const nowMs = Date.parse(nowIso);
  const startMs = Date.parse(sorted[0].validFrom);
  const totalMs = Math.max(1, nowMs - startMs);

  const summary = summarizePriceHistory(sorted, nowIso, basis);
  const { allTimeLowPaise, allTimeHighPaise, median90dPaise } = summary;
  const domainCandidates = [allTimeLowPaise, allTimeHighPaise];

  if (targetPricePaise !== undefined) {
    domainCandidates.push(targetPricePaise);
  }

  const rawMin = Math.min(...domainCandidates);
  const rawMax = Math.max(...domainCandidates);
  const spread = Math.max(100_000, rawMax - rawMin);
  const minLabelPaise = Math.max(0, Math.floor((rawMin - spread * 0.12) / 10_000) * 10_000);
  const maxLabelPaise = Math.ceil((rawMax + spread * 0.12) / 10_000) * 10_000;
  const priceRange = Math.max(1, maxLabelPaise - minLabelPaise);

  const toX = (ms: number): number => {
    return Number((padX + ((ms - startMs) / totalMs) * (width - padX * 2)).toFixed(1));
  };

  const toY = (paise: number): number => {
    return Number((height - padY - ((paise - minLabelPaise) / priceRange) * (height - padY * 2)).toFixed(1));
  };

  const points: StepChartPoint[] = sorted.map(span => {
    const { validFrom } = span;
    const pricePaise = pickSpanPrice(span, basis);

    return {
      x: toX(Date.parse(validFrom)),
      y: toY(pricePaise),
      pricePaise,
      timestamp: validFrom,
    };
  });

  const lastSpan = sorted[sorted.length - 1];
  const lastPrice = pickSpanPrice(lastSpan, basis);
  const endX = toX(nowMs);
  const endY = toY(lastPrice);

  points.push({ x: endX, y: endY, pricePaise: lastPrice, timestamp: nowIso });

  const pathSegments: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const { x: currX, y: currY } = curr;

    pathSegments.push(`H ${currX}`);

    if (currY !== prev.y) {
      pathSegments.push(`V ${currY}`);
    }
  }

  const stepPath = pathSegments.join(' ');
  const baselineY = height - padY;
  const areaPath = `${stepPath} V ${baselineY} H ${points[0].x} Z`;

  return {
    width,
    height,
    stepPath,
    areaPath,
    allTimeLowY: toY(allTimeLowPaise),
    medianY: toY(median90dPaise),
    targetY: targetPricePaise !== undefined ? toY(targetPricePaise) : null,
    minLabelPaise,
    maxLabelPaise,
    points,
  };
};
