import 'server-only';

import type { IndianRetailerId } from '@/domain/types';

export const RETAILER_DISPLAY_NAMES: Record<IndianRetailerId, string> = {
  'amazon-in': 'Amazon.in',
  flipkart: 'Flipkart',
  croma: 'Croma',
  'vijay-sales': 'Vijay Sales',
  'reliance-digital': 'Reliance Digital',
  mdcomputers: 'MDComputers',
  'vedant-computers': 'Vedant Computers',
  primeabgb: 'PrimeABGB',
  'lenovo-in': 'Lenovo India',
  'asus-in': 'ASUS eShop India',
  'external-in': 'Indian Store',
};

const SOURCE_RULES: Array<{ keyword: string; id: IndianRetailerId }> = [
  { keyword: 'amazon', id: 'amazon-in' },
  { keyword: 'flipkart', id: 'flipkart' },
  { keyword: 'croma', id: 'croma' },
  { keyword: 'vijay', id: 'vijay-sales' },
  { keyword: 'reliance', id: 'reliance-digital' },
  { keyword: 'mdcomputers', id: 'mdcomputers' },
  { keyword: 'md computers', id: 'mdcomputers' },
  { keyword: 'vedant', id: 'vedant-computers' },
  { keyword: 'primeabgb', id: 'primeabgb' },
  { keyword: 'lenovo', id: 'lenovo-in' },
  { keyword: 'asus', id: 'asus-in' },
];

export const mapMerchantSourceToId = (sourceName: string): { id: IndianRetailerId; displayName: string } => {
  const lower = sourceName.toLowerCase();
  const matched = SOURCE_RULES.find(rule => {
    return lower.includes(rule.keyword);
  });

  if (matched) {
    const { id } = matched;

    return { id, displayName: RETAILER_DISPLAY_NAMES[id] };
  }

  return {
    id: 'external-in',
    displayName: sourceName.trim() || RETAILER_DISPLAY_NAMES['external-in'],
  };
};
