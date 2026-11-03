import 'server-only';

import { calculateEffectivePrice } from '@/domain/effective-price';
import { groupRetailerOffers, matchesSpecFilter } from '@/domain/matching';
import { buildStepChartGeometry, recordPriceObservation } from '@/domain/price-history';
import { parseSearchInput } from '@/domain/query-parser';
import type {
  CanonicalProductGroup,
  ParsedSearchInput,
  PriceHistorySummary,
  PriceSpan,
  StepChartGeometry,
  UserWalletProfile,
  WatchRule,
} from '@/domain/types';
import { fetchOfferFromUrl } from '@/server/acquisition/json-ld-extractor';
import { discoverViaSerperIndia } from '@/server/acquisition/serper-shopping';
import type { WebhookFetchFn } from '@/server/notifications/discord-dispatcher';
import { mergeDiscoveredOffers, summarizeForGroup } from '@/server/services/catalog-helpers';
import { evaluateWatchesAndDispatchOutbox } from '@/server/services/watch-evaluator';
import {
  type CreateWatchInput,
  createWatchInStore,
  removeWatchFromStore,
  sendTestPingFromStore,
  toggleWatchPauseInStore,
} from '@/server/services/watch-mutations';
import { type DealStore, getPersistentDealStore, type NotificationOutboxRecord } from '@/server/store/deal-store';

export type { CreateWatchInput };

export interface ProductCardWithHistory {
  group: CanonicalProductGroup;
  history: PriceHistorySummary;
}

export interface SearchDealsResponse {
  parsedInput: ParsedSearchInput;
  groups: CanonicalProductGroup[];
  items: ProductCardWithHistory[];
}

export interface ProductDetailResponse {
  group: CanonicalProductGroup;
  history: PriceHistorySummary;
  chart: StepChartGeometry;
  spans: PriceSpan[];
  watches: WatchRule[];
}

export interface DealServiceOptions {
  store?: DealStore;
  webhookFetch?: WebhookFetchFn;
  enableLiveNetwork?: boolean;
}

export const createDealService = (options: DealServiceOptions = {}) => {
  const { store = getPersistentDealStore(), webhookFetch, enableLiveNetwork = false } = options;

  const getFeaturedDeals = (wallet?: UserWalletProfile): ProductCardWithHistory[] => {
    const { offers, spans } = store.readState();
    const nowIso = new Date().toISOString();
    const groups = groupRetailerOffers(offers, wallet);

    return groups.map(group => {
      return { group, history: summarizeForGroup(group, spans, nowIso) };
    });
  };

  const searchDeals = async (rawInput: string, wallet?: UserWalletProfile): Promise<SearchDealsResponse> => {
    const parsedInput = parseSearchInput(rawInput);
    const nowIso = new Date().toISOString();

    if (parsedInput.kind === 'url') {
      const { canonicalUrl, retailerId, externalId } = parsedInput;

      if (enableLiveNetwork) {
        const liveOffer = await fetchOfferFromUrl(canonicalUrl, retailerId);

        if (liveOffer) {
          mergeDiscoveredOffers(store, [liveOffer], nowIso);
        }
      }

      const { offers, spans } = store.readState();
      const allGroups = groupRetailerOffers(offers, wallet);
      const matched = allGroups.filter(group => {
        return group.offers.some(offer => {
          const { canonicalUrl: offerUrl, externalId: offerExt } = offer;

          return offerUrl === canonicalUrl || (Boolean(externalId) && offerExt === externalId);
        });
      });

      const items = matched.map(group => {
        return { group, history: summarizeForGroup(group, spans, nowIso) };
      });

      return { parsedInput, groups: matched, items };
    }

    const { normalizedQuery, specs, maxBudgetPaise } = parsedInput;

    if (enableLiveNetwork && normalizedQuery) {
      const serperOffers = await discoverViaSerperIndia(normalizedQuery);

      mergeDiscoveredOffers(store, serperOffers, nowIso);
    }

    const { offers, spans } = store.readState();
    const allGroups = groupRetailerOffers(offers, wallet);
    const filtered = normalizedQuery
      ? allGroups.filter(group => {
          return matchesSpecFilter(group, specs, maxBudgetPaise, normalizedQuery);
        })
      : allGroups;

    const items = filtered.map(group => {
      return { group, history: summarizeForGroup(group, spans, nowIso) };
    });

    return { parsedInput, groups: filtered, items };
  };

  const getProductDetail = (
    slug: string,
    wallet?: UserWalletProfile,
    targetPricePaise?: number,
  ): ProductDetailResponse | null => {
    const { offers, spans, watches } = store.readState();
    const nowIso = new Date().toISOString();
    const groups = groupRetailerOffers(offers, wallet);
    const group = groups.find(candidate => {
      return candidate.slug === slug;
    });

    if (!group) {
      return null;
    }

    const leadOfferId = group.bestUnconditionalOffer.id;
    const leadSpans = spans.filter(span => {
      return span.offerId === leadOfferId;
    });
    const history = summarizeForGroup(group, spans, nowIso);
    const chart = buildStepChartGeometry(leadSpans, { nowIso, targetPricePaise });
    const productWatches = watches.filter(watch => {
      return watch.productSlug === slug;
    });

    return { group, history, chart, spans: leadSpans, watches: productWatches };
  };

  const ingestOfferPriceUpdate = async (
    offerId: string,
    newBasePricePaise: number,
    inStock: boolean,
    observedAtIso = new Date().toISOString(),
  ): Promise<{ evaluated: number; alertsQueued: number; alertsSent: number }> => {
    store.writeState(current => {
      const { offers, spans } = current;
      const targetOffer = offers.find(item => {
        return item.id === offerId;
      });

      if (!targetOffer) {
        return current;
      }

      const { retailerId, priceRules } = targetOffer;
      const { unconditionalPricePaise, bestConditionalPricePaise } = calculateEffectivePrice(
        newBasePricePaise,
        priceRules,
      );
      const nextOffers = offers.map(item => {
        return item.id === offerId
          ? { ...item, basePricePaise: newBasePricePaise, inStock, lastVerifiedAt: observedAtIso }
          : item;
      });
      const nextSpans = recordPriceObservation(spans, {
        id: `span-${crypto.randomUUID()}`,
        offerId,
        retailerId,
        basePricePaise: newBasePricePaise,
        unconditionalPricePaise,
        bestConditionalPricePaise,
        inStock,
        observedAt: observedAtIso,
      });

      return { ...current, offers: nextOffers, spans: nextSpans };
    });

    return evaluateWatchesAndDispatchOutbox(store, observedAtIso, webhookFetch);
  };

  return {
    getFeaturedDeals,
    searchDeals,
    getProductDetail,
    createWatch: async (input: CreateWatchInput) => {
      return createWatchInStore(store, input);
    },
    ingestOfferPriceUpdate,
    listWatchesAndOutbox: (): { watches: WatchRule[]; outbox: NotificationOutboxRecord[] } => {
      const { watches, outbox } = store.readState();

      return { watches, outbox };
    },
    toggleWatchPause: (watchId: string) => {
      toggleWatchPauseInStore(store, watchId);
    },
    removeWatch: (watchId: string) => {
      removeWatchFromStore(store, watchId);
    },
    sendTestPingForWatch: async (watchId: string) => {
      return sendTestPingFromStore(store, watchId, webhookFetch);
    },
    pollActiveWatches: async () => {
      return evaluateWatchesAndDispatchOutbox(store, new Date().toISOString(), webhookFetch);
    },
  };
};

export const defaultDealService = createDealService({
  enableLiveNetwork: true,
});
