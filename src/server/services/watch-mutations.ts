import 'server-only';

import { groupRetailerOffers, matchesSpecFilter } from '@/domain/matching';
import type { PaymentInstrument, ProductSpecs, WatchPriceBasis, WatchRule, WatchTriggerMode } from '@/domain/types';
import { buildDiscordDealAlertPayload, validateDiscordWebhookUrl } from '@/lib/discord-webhook';
import { dispatchDiscordWebhook, type WebhookFetchFn } from '@/server/notifications/discord-dispatcher';
import type { DealStore } from '@/server/store/deal-store';

export interface CreateWatchInput {
  label: string;
  productSlug?: string;
  specQuery?: ProductSpecs;
  triggerMode: WatchTriggerMode;
  priceBasis: WatchPriceBasis;
  baselinePricePaise?: number;
  targetPricePaise?: number;
  dropPctTarget?: number;
  discordWebhookUrl: string;
  walletInstruments: PaymentInstrument[];
}

export const createWatchInStore = (
  store: DealStore,
  input: CreateWatchInput,
): { ok: true; watch: WatchRule } | { ok: false; error: string } => {
  const {
    label,
    productSlug,
    specQuery,
    triggerMode,
    priceBasis,
    baselinePricePaise,
    targetPricePaise,
    dropPctTarget,
    discordWebhookUrl,
    walletInstruments,
  } = input;

  const { ok: validWebhook, normalizedUrl, error } = validateDiscordWebhookUrl(discordWebhookUrl);

  if (!validWebhook || !normalizedUrl) {
    return { ok: false, error: error ?? 'Invalid Discord webhook URL.' };
  }

  const { offers } = store.readState();
  const groups = groupRetailerOffers(
    offers,
    walletInstruments.length > 0 ? { instruments: walletInstruments } : undefined,
  );
  const targetGroup = productSlug
    ? groups.find(item => {
        return item.slug === productSlug;
      })
    : groups.find(item => {
        return specQuery ? matchesSpecFilter(item, specQuery) : false;
      });

  const resolvedBaseline =
    baselinePricePaise ??
    (targetGroup ? targetGroup.bestUnconditionalOffer.pricing.unconditionalPricePaise : (targetPricePaise ?? 0));

  const newWatch: WatchRule = {
    id: `watch-${crypto.randomUUID()}`,
    label: label.trim() || 'Indian Price Watch',
    productSlug,
    specQuery,
    triggerMode,
    priceBasis,
    baselinePricePaise: resolvedBaseline,
    targetPricePaise,
    dropPctTarget,
    lastAlertedPricePaise: null,
    lastAlertedAt: null,
    aboveRearmSince: null,
    state: 'armed',
    discordWebhookUrl: normalizedUrl,
    walletInstruments,
    createdAt: new Date().toISOString(),
  };

  store.writeState(current => {
    return { ...current, watches: [newWatch, ...current.watches] };
  });

  return { ok: true, watch: newWatch };
};

export const toggleWatchPauseInStore = (store: DealStore, watchId: string): void => {
  store.writeState(current => {
    return {
      ...current,
      watches: current.watches.map(watch => {
        const { id, state } = watch;

        if (id !== watchId) {
          return watch;
        }

        return { ...watch, state: state === 'paused' ? 'armed' : 'paused' };
      }),
    };
  });
};

export const removeWatchFromStore = (store: DealStore, watchId: string): void => {
  store.writeState(current => {
    return {
      ...current,
      watches: current.watches.filter(watch => {
        return watch.id !== watchId;
      }),
    };
  });
};

export const sendTestPingFromStore = async (
  store: DealStore,
  watchId: string,
  webhookFetch?: WebhookFetchFn,
): Promise<{ ok: boolean; error?: string }> => {
  const { watches, offers } = store.readState();
  const watch = watches.find(item => {
    return item.id === watchId;
  });

  if (!watch) {
    return { ok: false, error: 'Watch rule not found.' };
  }

  const { label, discordWebhookUrl, productSlug, baselinePricePaise, targetPricePaise } = watch;
  const groups = groupRetailerOffers(offers);
  const matched = productSlug
    ? groups.find(group => {
        return group.slug === productSlug;
      })
    : groups[0];
  const leadOffer = matched?.bestUnconditionalOffer;

  const payload = buildDiscordDealAlertPayload({
    watchLabel: label,
    productTitle: matched?.canonicalTitle ?? label,
    retailerName: leadOffer?.retailerName ?? 'dealHound Test',
    productUrl: leadOffer?.canonicalUrl ?? 'https://www.amazon.in',
    unconditionalPricePaise: leadOffer?.pricing.unconditionalPricePaise ?? baselinePricePaise,
    bestConditionalPricePaise: leadOffer?.pricing.bestConditionalPricePaise ?? targetPricePaise ?? baselinePricePaise,
    paymentNote: leadOffer?.pricing.selectedPaymentLabel,
    verdict: 'great_deal',
    reason: 'Webhook connectivity check triggered from dealHound India.',
  });

  const result = await dispatchDiscordWebhook(discordWebhookUrl, payload, webhookFetch);

  return { ok: result.ok, error: result.error };
};
