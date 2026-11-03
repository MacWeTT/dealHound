import type { DealVerdict, PaymentInstrument } from '@/domain/types';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const formatInr = (paise: number): string => {
  const rupees = Math.round(paise / 100);

  return inrFormatter.format(rupees);
};

export const parseInrToPaise = (rawInput: string): number | null => {
  const cleaned = rawInput
    .trim()
    .toLowerCase()
    .replace(/^(?:₹|rs\.?|inr)\s*/i, '');

  if (!cleaned) {
    return null;
  }

  const lakhMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)$/i);

  if (lakhMatch) {
    return Math.round(Number(lakhMatch[1]) * 100_000 * 100);
  }

  const kMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*k$/i);

  if (kMatch) {
    return Math.round(Number(kMatch[1]) * 1_000 * 100);
  }

  const plainDigits = cleaned.replace(/,/g, '');

  if (/^\d+(?:\.\d{1,2})?$/.test(plainDigits)) {
    const value = Number(plainDigits);

    return value > 0 ? Math.round(value * 100) : null;
  }

  return null;
};

export const formatRelativeFreshness = (verifiedIso: string, nowIso?: string): string => {
  const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
  const verifiedMs = Date.parse(verifiedIso);
  const diffMinutes = Math.max(0, Math.round((nowMs - verifiedMs) / 60_000));

  if (diffMinutes < 2) {
    return 'Verified just now';
  }

  if (diffMinutes < 60) {
    return `Verified ${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `Verified ${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);

  return `Stale (${diffDays}d ago)`;
};

export interface PaymentOptionMeta {
  id: PaymentInstrument;
  shortLabel: string;
  fullLabel: string;
}

export const INDIAN_PAYMENT_OPTIONS: PaymentOptionMeta[] = [
  { id: 'hdfc-cc', shortLabel: 'HDFC CC', fullLabel: 'HDFC Bank Credit Card' },
  { id: 'icici-cc', shortLabel: 'ICICI CC', fullLabel: 'ICICI Bank Credit Card' },
  { id: 'sbi-cc', shortLabel: 'SBI CC', fullLabel: 'SBI Credit Card' },
  { id: 'axis-cc', shortLabel: 'Axis CC', fullLabel: 'Axis Bank Credit Card' },
  { id: 'amazon-pay-icici', shortLabel: 'Amazon Pay ICICI', fullLabel: 'Amazon Pay ICICI Credit Card' },
  { id: 'flipkart-axis', shortLabel: 'Flipkart Axis', fullLabel: 'Flipkart Axis Bank Credit Card' },
  { id: 'kotak-cc', shortLabel: 'Kotak CC', fullLabel: 'Kotak Credit Card' },
  { id: 'upi', shortLabel: 'UPI', fullLabel: 'UPI Instant Payment' },
];

export const VERDICT_META: Record<DealVerdict, { label: string; tone: 'good' | 'neutral' | 'warn' }> = {
  all_time_low: { label: 'All-Time Low', tone: 'good' },
  great_deal: { label: 'Great Deal', tone: 'good' },
  fair_price: { label: 'Typical Price', tone: 'neutral' },
  inflated_hike: { label: 'Pre-Sale Hike Warning', tone: 'warn' },
  above_typical: { label: 'Above Typical', tone: 'warn' },
};
