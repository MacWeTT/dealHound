import { describe, expect, it } from 'vitest';

import { buildSearchHref, parseWalletFromParam } from '@/lib/wallet-query';

describe('wallet-query helpers', () => {
  it('parses valid comma-separated Indian payment instruments and ignores unknown values', () => {
    const wallet = parseWalletFromParam('hdfc-cc,amazon-pay-icici,unknown-card');

    expect(wallet).toBeDefined();
    expect(wallet?.instruments).toEqual(['hdfc-cc', 'amazon-pay-icici']);
    expect(parseWalletFromParam(undefined)).toBeUndefined();
  });

  it('builds clean URLs preserving query and selected wallet cards', () => {
    expect(buildSearchHref('RTX 5060 laptop', ['hdfc-cc', 'sbi-cc'])).toBe(
      '/search?q=RTX+5060+laptop&cards=hdfc-cc%2Csbi-cc',
    );
    expect(buildSearchHref('RTX 5060 laptop', [])).toBe('/search?q=RTX+5060+laptop');
  });
});

