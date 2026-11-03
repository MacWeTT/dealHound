import { describe, expect, it } from 'vitest';

import { parseSearchInput } from '@/domain/query-parser';

describe('parseSearchInput', () => {
  it('parses an Amazon India product URL, strips affiliate tracking params, and extracts the ASIN', () => {
    const parsed = parseSearchInput(
      'https://www.amazon.in/ASUS-TUF-Gaming-A15-Laptop/dp/B0DF5060NV/ref=sr_1_2?tag=tracker-21&utm_source=share&th=1',
    );

    expect(parsed.kind).toBe('url');

    if (parsed.kind === 'url') {
      expect(parsed.retailerId).toBe('amazon-in');
      expect(parsed.externalId).toBe('B0DF5060NV');
      expect(parsed.canonicalUrl).toBe('https://www.amazon.in/dp/B0DF5060NV');
    }
  });

  it('parses Flipkart and specialist Indian PC store URLs cleanly', () => {
    const flipkart = parseSearchInput(
      'https://www.flipkart.com/asus-tuf-gaming-a15-ryzen-7/p/itm987654abc?pid=COMG12345&affid=dealhound&utm_medium=cpc',
    );
    const md = parseSearchInput('https://mdcomputers.in/asus-tuf-a15-fa507nv-lp082w.html?utm_campaign=sale');

    expect(flipkart.kind).toBe('url');
    expect(md.kind).toBe('url');

    if (flipkart.kind === 'url' && md.kind === 'url') {
      expect(flipkart.retailerId).toBe('flipkart');
      expect(flipkart.externalId).toBe('COMG12345');
      expect(flipkart.canonicalUrl).toContain('pid=COMG12345');
      expect(flipkart.canonicalUrl).not.toContain('affid=');
      expect(md.retailerId).toBe('mdcomputers');
      expect(md.canonicalUrl).toBe('https://mdcomputers.in/asus-tuf-a15-fa507nv-lp082w.html');
    }
  });

  it('parses GPU, RAM, storage, category, and Indian k/lakh budget from natural queries', () => {
    const queryK = parseSearchInput('RTX 5060 laptop 16GB 1TB SSD under 95k');
    const queryLakh = parseSearchInput('RTX 5060 Ti laptop 32GB below 1.25 lakh');

    expect(queryK.kind).toBe('query');
    expect(queryLakh.kind).toBe('query');

    if (queryK.kind === 'query' && queryLakh.kind === 'query') {
      expect(queryK.specs.gpu).toBe('rtx 5060');
      expect(queryK.specs.ramGb).toBe(16);
      expect(queryK.specs.storageGb).toBe(1024);
      expect(queryK.category).toBe('laptop');
      expect(queryK.maxBudgetPaise).toBe(9_500_000);

      expect(queryLakh.specs.gpu).toBe('rtx 5060 ti');
      expect(queryLakh.specs.ramGb).toBe(32);
      expect(queryLakh.maxBudgetPaise).toBe(12_500_000);
    }
  });

  it('does not confuse GPU VRAM (8GB) with system RAM and extracts laptop MPNs', () => {
    const parsed = parseSearchInput('ASUS FA507NV-LP082W RTX 5060 8GB GDDR7 under ₹89,990');

    expect(parsed.kind).toBe('query');

    if (parsed.kind === 'query') {
      expect(parsed.specs.brand).toBe('asus');
      expect(parsed.specs.mpn).toBe('FA507NV-LP082W');
      expect(parsed.specs.gpu).toBe('rtx 5060');
      expect(parsed.specs.vramGb).toBe(8);
      expect(parsed.specs.ramGb).toBeUndefined();
      expect(parsed.maxBudgetPaise).toBe(8_999_000);
    }
  });
});

