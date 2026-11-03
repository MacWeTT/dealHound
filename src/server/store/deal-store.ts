import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

import type { PriceSpan, RawRetailerOffer, WatchRule } from '@/domain/types';
import type { DiscordWebhookPayload } from '@/lib/discord-webhook';
import { buildInitialSeedSpans } from '@/server/catalog/india-seed-history';
import { INDIA_SEED_OFFERS } from '@/server/catalog/india-seed-offers';

export interface NotificationOutboxRecord {
  id: string;
  idempotencyKey: string;
  watchId: string;
  discordWebhookUrl: string;
  payload: DiscordWebhookPayload;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  createdAt: string;
  sentAt: string | null;
}

export interface PersistedDealState {
  offers: RawRetailerOffer[];
  spans: PriceSpan[];
  watches: WatchRule[];
  outbox: NotificationOutboxRecord[];
}

export interface DealStore {
  readState: () => PersistedDealState;
  writeState: (updater: (current: PersistedDealState) => PersistedDealState) => PersistedDealState;
}

const buildFreshSeedState = (): PersistedDealState => {
  return {
    offers: structuredClone(INDIA_SEED_OFFERS),
    spans: buildInitialSeedSpans(),
    watches: [],
    outbox: [],
  };
};

export const createInMemoryDealStore = (initial?: Partial<PersistedDealState>): DealStore => {
  const { offers: seedOffers, spans: seedSpans, watches: seedWatches, outbox: seedOutbox } = buildFreshSeedState();
  let state: PersistedDealState = {
    offers: initial?.offers ?? seedOffers,
    spans: initial?.spans ?? seedSpans,
    watches: initial?.watches ?? seedWatches,
    outbox: initial?.outbox ?? seedOutbox,
  };

  return {
    readState: () => {
      return state;
    },
    writeState: updater => {
      state = updater(state);

      return state;
    },
  };
};

// shortcut: single-node atomic JSON store in .data/dealhound-store.json (~5,000 offers limit), upgrade to Supabase Postgres when deploying multi-instance or background Edge workers.
const STORE_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(STORE_DIR, 'dealhound-store.json');

const loadDiskState = (): PersistedDealState => {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      const seeded = buildFreshSeedState();

      fs.mkdirSync(STORE_DIR, { recursive: true });
      fs.writeFileSync(STORE_FILE, JSON.stringify(seeded, null, 2), 'utf8');

      return seeded;
    }

    const raw = fs.readFileSync(STORE_FILE, 'utf8');

    return JSON.parse(raw) as PersistedDealState;
  } catch {
    return buildFreshSeedState();
  }
};

const saveDiskState = (next: PersistedDealState): void => {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  const tempFile = `${STORE_FILE}.tmp`;

  fs.writeFileSync(tempFile, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(tempFile, STORE_FILE);
};

let singletonDiskStore: DealStore | null = null;

export const getPersistentDealStore = (): DealStore => {
  if (!singletonDiskStore) {
    singletonDiskStore = {
      readState: () => {
        return loadDiskState();
      },
      writeState: updater => {
        const current = loadDiskState();
        const updated = updater(current);

        saveDiskState(updated);

        return updated;
      },
    };
  }

  return singletonDiskStore;
};
