import 'server-only';

import { evaluateWatchRule } from '@/domain/alert-rules';
import { groupRetailerOffers, matchesSpecFilter } from '@/domain/matching';
import { summarizePriceHistory } from '@/domain/price-history';
import type { CanonicalProductGroup, PriceSpan, RawRetailerOffer, WatchRule } from '@/domain/types';
import { buildDiscordDealAlertPayload } from '@/lib/discord-webhook';
import { dispatchDiscordWebhook, type WebhookFetchFn } from '@/server/notifications/discord-dispatcher';
import type { DealStore, NotificationOutboxRecord } from '@/server/store/deal-store';

const findBestMatchingGroupForWatch = (
  watch: WatchRule,
  offers: RawRetailerOffer[],
): CanonicalProductGroup | undefined => {
  const { productSlug, specQuery, walletInstruments } = watch;
  const wallet = walletInstruments.length > 0 ? { instruments: walletInstruments } : undefined;
  const groups = groupRetailerOffers(offers, wallet);

  if (productSlug) {
    return groups.find(group => {
      return group.slug === productSlug;
    });
  }

  if (specQuery) {
    const candidates = groups.filter(group => {
      return matchesSpecFilter(group, specQuery);
    });

    return candidates[0];
  }

  return undefined;
};

const getGroupSpans = (group: CanonicalProductGroup, allSpans: PriceSpan[]): PriceSpan[] => {
  const offerIds = new Set(
    group.offers.map(offer => {
      return offer.id;
    }),
  );

  return allSpans.filter(span => {
    return offerIds.has(span.offerId);
  });
};

export const evaluateWatchesAndDispatchOutbox = async (
  store: DealStore,
  nowIso: string,
  webhookFetch?: WebhookFetchFn,
): Promise<{ evaluated: number; alertsQueued: number; alertsSent: number }> => {
  let evaluated = 0;
  let alertsQueued = 0;

  store.writeState(current => {
    const { offers, spans, watches, outbox } = current;
    const existingKeys = new Set(
      outbox.map(record => {
        return record.idempotencyKey;
      }),
    );
    const nextOutbox: NotificationOutboxRecord[] = [...outbox];

    const nextWatches = watches.map(watch => {
      const { id: watchId, label: watchLabel, priceBasis, discordWebhookUrl, state } = watch;

      if (state === 'paused') {
        return watch;
      }

      const matchedGroup = findBestMatchingGroupForWatch(watch, offers);

      if (!matchedGroup) {
        return watch;
      }

      evaluated += 1;

      const { canonicalTitle, imageUrl, bestUnconditionalOffer, bestConditionalOffer } = matchedGroup;
      const chosenOffer = priceBasis === 'best_conditional' ? bestConditionalOffer : bestUnconditionalOffer;
      const { id: chosenOfferId, inStock, retailerName, canonicalUrl, pricing: chosenPricing } = chosenOffer;
      const { unconditionalPricePaise, bestConditionalPricePaise, selectedPaymentLabel } = chosenPricing;

      const groupSpans = getGroupSpans(matchedGroup, spans);
      const historySummary =
        groupSpans.length > 0
          ? summarizePriceHistory(groupSpans, nowIso, priceBasis)
          : { allTimeLowPaise: unconditionalPricePaise, verdict: 'fair_price' as const };
      const { allTimeLowPaise, verdict } = historySummary;

      const evaluation = evaluateWatchRule(watch, {
        inStock,
        unconditionalPricePaise,
        bestConditionalPricePaise,
        allTimeLowPaise,
        nowIso,
      });

      const {
        shouldAlert,
        reason,
        observedPricePaise,
        nextState,
        nextLastAlertedPricePaise,
        nextLastAlertedAt,
        nextAboveRearmSince,
      } = evaluation;

      if (shouldAlert) {
        const activeSpan = spans.find(span => {
          const { offerId, endedAt } = span;

          return offerId === chosenOfferId && endedAt === null;
        });
        const spanToken = activeSpan ? activeSpan.id : nowIso;
        const idempotencyKey = `${watchId}:${spanToken}:${observedPricePaise}`;

        if (!existingKeys.has(idempotencyKey)) {
          existingKeys.add(idempotencyKey);
          alertsQueued += 1;
          nextOutbox.push({
            id: `outbox-${crypto.randomUUID()}`,
            idempotencyKey,
            watchId,
            discordWebhookUrl,
            payload: buildDiscordDealAlertPayload({
              watchLabel,
              productTitle: canonicalTitle,
              retailerName,
              productUrl: canonicalUrl,
              unconditionalPricePaise,
              bestConditionalPricePaise,
              paymentNote: selectedPaymentLabel,
              verdict,
              reason,
              imageUrl,
            }),
            status: 'pending',
            attempts: 0,
            createdAt: nowIso,
            sentAt: null,
          });
        }
      }

      return {
        ...watch,
        state: nextState,
        lastAlertedPricePaise: nextLastAlertedPricePaise,
        lastAlertedAt: nextLastAlertedAt,
        aboveRearmSince: nextAboveRearmSince,
      };
    });

    return {
      ...current,
      watches: nextWatches,
      outbox: nextOutbox,
    };
  });

  const pendingRecords = store.readState().outbox.filter(item => {
    return item.status === 'pending';
  });
  let alertsSent = 0;

  for (const record of pendingRecords) {
    const { id: recordId, discordWebhookUrl, payload } = record;
    const result = await dispatchDiscordWebhook(discordWebhookUrl, payload, webhookFetch);
    const succeeded = result.ok;

    if (succeeded) {
      alertsSent += 1;
    }

    store.writeState(current => {
      return {
        ...current,
        outbox: current.outbox.map(entry => {
          const { id: entryId, attempts } = entry;

          if (entryId !== recordId) {
            return entry;
          }

          return {
            ...entry,
            status: succeeded ? 'sent' : 'failed',
            attempts: attempts + 1,
            sentAt: succeeded ? new Date().toISOString() : null,
          };
        }),
      };
    });
  }

  return { evaluated, alertsQueued, alertsSent };
};
