import type { PaymentInstrument, UserWalletProfile } from '@/domain/types';
import { INDIAN_PAYMENT_OPTIONS } from '@/lib/inr';

const VALID_INSTRUMENTS = new Set<string>(
  INDIAN_PAYMENT_OPTIONS.map(option => {
    return option.id;
  }),
);

export const parseWalletFromParam = (rawParam: string | string[] | undefined): UserWalletProfile | undefined => {
  const joined = Array.isArray(rawParam) ? rawParam.join(',') : rawParam;

  if (!joined) {
    return undefined;
  }

  const instruments = joined
    .split(',')
    .map(token => {
      return token.trim();
    })
    .filter((token): token is PaymentInstrument => {
      return VALID_INSTRUMENTS.has(token);
    });

  if (instruments.length === 0) {
    return undefined;
  }

  return { instruments };
};

export const serializeWalletParam = (instruments: PaymentInstrument[] | undefined): string | undefined => {
  if (!instruments || instruments.length === 0) {
    return undefined;
  }

  return instruments.join(',');
};

export const buildSearchHref = (query: string, instruments: PaymentInstrument[] = []): string => {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set('q', query.trim());
  }

  if (instruments.length > 0) {
    params.set('cards', instruments.join(','));
  }

  const qs = params.toString();

  return qs ? `/search?${qs}` : '/search';
};

export const buildProductHref = (slug: string, instruments: PaymentInstrument[] = []): string => {
  if (instruments.length === 0) {
    return `/product/${slug}`;
  }

  const params = new URLSearchParams({ cards: instruments.join(',') });

  return `/product/${slug}?${params.toString()}`;
};

