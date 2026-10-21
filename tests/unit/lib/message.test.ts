import { describe, expect, it } from 'vitest';
import { msg } from '@/lib/message';
import { tr } from '@tests/support/translate';

describe('msg and tr', () => {
  it('turns a message key into its English text', () => {
    expect(tr(msg('common.theme.toDark'))).toBe('Switch to dark mode');
  });

  it('gives no text for no message', () => {
    expect(tr(null)).toBe('');
  });
});
