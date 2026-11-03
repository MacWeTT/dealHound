import 'server-only';

import type { RawRetailerOffer } from '@/domain/types';
import { INDIA_SEED_HARDWARE_OFFERS } from '@/server/catalog/india-seed-hardware';
import { INDIA_SEED_LAPTOP_OFFERS } from '@/server/catalog/india-seed-laptops';

export const INDIA_SEED_OFFERS: RawRetailerOffer[] = [...INDIA_SEED_LAPTOP_OFFERS, ...INDIA_SEED_HARDWARE_OFFERS];
