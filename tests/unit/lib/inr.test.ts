import { describe, expect, it } from 'vitest';

import { formatInr, formatRelativeFreshness, parseInrToPaise } from '@/lib/inr';

describe('INR formatting & parsing helpers', () => {
  it('formats paise into Indian numbering system (lakhs/crores)', () => {
    expect(formatInr(8_499_000)).toBe('₹84,990');
    expect(formatInr(11_499_000)).toBe('₹1,14,990');
    expect(formatInr(9_900)).toBe('₹99');
  });

  it('parses rupee inputs including commas, k, and lakh shorthands into integer paise', () => {
    expect(parseInrToPaise('₹84,990')).toBe(8_499_000);
    expect(parseInrToPaise('92k')).toBe(9_200_000);
    expect(parseInrToPaise('1.15 lakh')).toBe(11_500_000);
    expect(parseInrToPaise('invalid')).toBeNull();
  });

  it('formats verification freshness clearly', () => {
    expect(formatRelativeFreshness('2026-11-04T00:45:00.000Z', '2026-11-04T01:00:00.000Z')).toBe('Verified 15m ago');
    expect(formatRelativeFreshness('2026-11-01T01:00:00.000Z', '2026-11-04T01:00:00.000Z')).toBe('Stale (3d ago)');
  });
});

