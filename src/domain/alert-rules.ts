import type { AlertEvaluationResult, WatchRule } from '@/domain/types';

export interface WatchCandidateSnapshot {
  inStock: boolean;
  unconditionalPricePaise: number;
  bestConditionalPricePaise: number;
  allTimeLowPaise: number;
  nowIso: string;
}

const DEEPER_DROP_STEP_BPS = 200; // 2% lower than lastAlertedPricePaise
const HYSTERESIS_BUFFER_BPS = 300; // 3% above threshold before re-arm clock starts
const REARM_SUSTAINED_MS = 48 * 60 * 60 * 1000; // 48 hours sustained rebound

const resolveThresholdPaise = (watch: WatchRule, allTimeLowPaise: number): number => {
  const { triggerMode, baselinePricePaise, targetPricePaise, dropPctTarget } = watch;

  if (triggerMode === 'target_price') {
    return targetPricePaise ?? baselinePricePaise;
  }

  if (triggerMode === 'pct_drop') {
    const pct = dropPctTarget ?? 5;

    return Math.round(baselinePricePaise * (1 - pct / 100));
  }

  if (triggerMode === 'all_time_low') {
    return allTimeLowPaise;
  }

  if (triggerMode === 'restock') {
    return Number.MAX_SAFE_INTEGER;
  }

  // 'any_drop': at least 1% below baseline
  return Math.round(baselinePricePaise * 0.99);
};

export const evaluateWatchRule = (watch: WatchRule, snapshot: WatchCandidateSnapshot): AlertEvaluationResult => {
  const { state, priceBasis, triggerMode, lastAlertedPricePaise, lastAlertedAt, aboveRearmSince } = watch;
  const { inStock, unconditionalPricePaise, bestConditionalPricePaise, allTimeLowPaise, nowIso } = snapshot;
  const observedPricePaise = priceBasis === 'best_conditional' ? bestConditionalPricePaise : unconditionalPricePaise;

  if (state === 'paused') {
    return {
      shouldAlert: false,
      reason: 'Watch is paused.',
      observedPricePaise,
      nextState: 'paused',
      nextLastAlertedPricePaise: lastAlertedPricePaise,
      nextLastAlertedAt: lastAlertedAt,
      nextAboveRearmSince: aboveRearmSince,
    };
  }

  if (!inStock) {
    return {
      shouldAlert: false,
      reason: 'Item is currently out of stock.',
      observedPricePaise,
      nextState: triggerMode === 'restock' ? 'armed' : state,
      nextLastAlertedPricePaise: lastAlertedPricePaise,
      nextLastAlertedAt: lastAlertedAt,
      nextAboveRearmSince: aboveRearmSince,
    };
  }

  const thresholdPaise = resolveThresholdPaise(watch, allTimeLowPaise);
  const meetsThreshold = observedPricePaise <= thresholdPaise;

  if (state === 'armed') {
    if (meetsThreshold) {
      return {
        shouldAlert: true,
        reason: `Price dropped to target threshold (${triggerMode}).`,
        observedPricePaise,
        nextState: 'triggered',
        nextLastAlertedPricePaise: observedPricePaise,
        nextLastAlertedAt: nowIso,
        nextAboveRearmSince: null,
      };
    }

    return {
      shouldAlert: false,
      reason: 'Observed price is still above target threshold.',
      observedPricePaise,
      nextState: 'armed',
      nextLastAlertedPricePaise: lastAlertedPricePaise,
      nextLastAlertedAt: lastAlertedAt,
      nextAboveRearmSince: null,
    };
  }

  // state === 'triggered': check deeper low-water mark first, otherwise hysteresis rebound
  const deeperLowTarget =
    lastAlertedPricePaise !== null
      ? Math.round(lastAlertedPricePaise * (1 - DEEPER_DROP_STEP_BPS / 10_000))
      : thresholdPaise;

  if (meetsThreshold && observedPricePaise <= deeperLowTarget) {
    return {
      shouldAlert: true,
      reason: 'New low-water mark reached (at least 2% deeper than last alert).',
      observedPricePaise,
      nextState: 'triggered',
      nextLastAlertedPricePaise: observedPricePaise,
      nextLastAlertedAt: nowIso,
      nextAboveRearmSince: null,
    };
  }

  const rearmCeilingPaise =
    triggerMode === 'restock'
      ? Number.MAX_SAFE_INTEGER
      : Math.round(thresholdPaise * (1 + HYSTERESIS_BUFFER_BPS / 10_000));

  if (observedPricePaise >= rearmCeilingPaise) {
    const reboundStartIso = aboveRearmSince ?? nowIso;
    const elapsedMs = Date.parse(nowIso) - Date.parse(reboundStartIso);

    if (elapsedMs >= REARM_SUSTAINED_MS) {
      return {
        shouldAlert: false,
        reason: 'Price sustained above hysteresis ceiling for 48h — watch re-armed.',
        observedPricePaise,
        nextState: 'armed',
        nextLastAlertedPricePaise: null,
        nextLastAlertedAt: lastAlertedAt,
        nextAboveRearmSince: null,
      };
    }

    return {
      shouldAlert: false,
      reason: 'Price rebounded above hysteresis ceiling; awaiting 48h confirmation to re-arm.',
      observedPricePaise,
      nextState: 'triggered',
      nextLastAlertedPricePaise: lastAlertedPricePaise,
      nextLastAlertedAt: lastAlertedAt,
      nextAboveRearmSince: reboundStartIso,
    };
  }

  return {
    shouldAlert: false,
    reason: 'Already alerted at this price tier; suppressing duplicate notification.',
    observedPricePaise,
    nextState: 'triggered',
    nextLastAlertedPricePaise: lastAlertedPricePaise,
    nextLastAlertedAt: lastAlertedAt,
    nextAboveRearmSince: null,
  };
};
