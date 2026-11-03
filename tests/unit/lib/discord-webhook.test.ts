import { describe, expect, it } from 'vitest';

import { buildDiscordDealAlertPayload, validateDiscordWebhookUrl } from '@/lib/discord-webhook';

describe('discord-webhook helpers', () => {
  it('accepts official Discord HTTPS webhook URLs and blocks SSRF/non-Discord URLs', () => {
    expect(
      validateDiscordWebhookUrl('https://discord.com/api/webhooks/123456789012345678/abcDEF_123-tokenValue').ok,
    ).toBe(true);
    expect(validateDiscordWebhookUrl('https://canary.discord.com/api/webhooks/123456789012345678/abcDEF_123').ok).toBe(
      true,
    );

    expect(validateDiscordWebhookUrl('http://discord.com/api/webhooks/123456789012345678/abcDEF_123').ok).toBe(false);
    expect(validateDiscordWebhookUrl('https://127.0.0.1/api/webhooks/123456789012345678/abcDEF_123').ok).toBe(false);
    expect(
      validateDiscordWebhookUrl('https://evil.example/https://discord.com/api/webhooks/123456789012345678/abc').ok,
    ).toBe(false);
  });

  it('constructs a structured Discord rich embed with INR pricing and direct Indian retailer link', () => {
    const payload = buildDiscordDealAlertPayload({
      watchLabel: 'ASUS TUF A15 RTX 5060',
      productTitle: 'ASUS TUF Gaming A15 (RYZEN 7 8845HS / RTX 5060 / 16GB / 1TB SSD)',
      retailerName: 'Amazon.in',
      productUrl: 'https://www.amazon.in/dp/B0DF5060NV',
      unconditionalPricePaise: 8_999_000,
      bestConditionalPricePaise: 8_549_000,
      paymentNote: '₹4,500 off on HDFC CC',
      verdict: 'all_time_low',
      reason: 'Price dropped below ₹87,000 target.',
    });

    expect(payload.username).toBe('dealHound India');
    expect(payload.embeds).toHaveLength(1);
    expect(payload.embeds[0].title).toContain('ASUS TUF Gaming A15');
    expect(payload.embeds[0].url).toBe('https://www.amazon.in/dp/B0DF5060NV');
    expect(JSON.stringify(payload.embeds[0].fields)).toContain('₹85,490');
    expect(JSON.stringify(payload.embeds[0].fields)).toContain('₹89,990');
  });
});
