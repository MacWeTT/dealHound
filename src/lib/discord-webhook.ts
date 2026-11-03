import type { DealVerdict } from '@/domain/types';
import { formatInr, VERDICT_META } from '@/lib/inr';

const DISCORD_HOSTS = new Set(['discord.com', 'discordapp.com', 'canary.discord.com', 'ptb.discord.com']);
const WEBHOOK_PATH_REGEX = /^\/api\/(?:v\d+\/)?webhooks\/(\d{15,22})\/([A-Za-z0-9_-]{8,160})\/?$/;

export type WebhookValidationResult =
  | { ok: true; normalizedUrl: string; webhookId: string; error?: undefined }
  | { ok: false; error: string; normalizedUrl?: undefined; webhookId?: undefined };

export const validateDiscordWebhookUrl = (rawUrl: string): WebhookValidationResult => {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return { ok: false, error: 'Enter a Discord channel webhook URL.' };
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Invalid URL format.' };
  }

  const { protocol, hostname, pathname } = parsed;

  if (protocol !== 'https:') {
    return { ok: false, error: 'Discord webhook must use HTTPS.' };
  }

  if (!DISCORD_HOSTS.has(hostname.toLowerCase())) {
    return { ok: false, error: 'Hostname must be an official discord.com webhook endpoint.' };
  }

  const pathMatch = pathname.match(WEBHOOK_PATH_REGEX);

  if (!pathMatch) {
    return { ok: false, error: 'URL path must match /api/webhooks/<id>/<token>.' };
  }

  const webhookId = pathMatch[1];
  const token = pathMatch[2];

  return {
    ok: true,
    normalizedUrl: `https://${hostname.toLowerCase()}/api/webhooks/${webhookId}/${token}`,
    webhookId,
  };
};

export interface DiscordDealAlertInput {
  watchLabel: string;
  productTitle: string;
  retailerName: string;
  productUrl: string;
  unconditionalPricePaise: number;
  bestConditionalPricePaise: number;
  paymentNote?: string;
  verdict: DealVerdict;
  reason: string;
  imageUrl?: string;
}

export interface DiscordWebhookPayload {
  username: string;
  embeds: Array<{
    title: string;
    url: string;
    description: string;
    color: number;
    fields: Array<{ name: string; value: string; inline: boolean }>;
    thumbnail?: { url: string };
    footer: { text: string };
    timestamp: string;
  }>;
}

const VERDICT_COLORS: Record<DealVerdict, number> = {
  all_time_low: 0x15803d,
  great_deal: 0x16a34a,
  fair_price: 0xc2410c,
  inflated_hike: 0xd97706,
  above_typical: 0x78716c,
};

export const buildDiscordDealAlertPayload = (input: DiscordDealAlertInput): DiscordWebhookPayload => {
  const {
    watchLabel,
    productTitle,
    retailerName,
    productUrl,
    unconditionalPricePaise,
    bestConditionalPricePaise,
    paymentNote,
    verdict,
    reason,
    imageUrl,
  } = input;

  const verdictInfo = VERDICT_META[verdict];
  const cardValue =
    bestConditionalPricePaise < unconditionalPricePaise
      ? `${formatInr(bestConditionalPricePaise)}${paymentNote ? ` (${paymentNote})` : ''}`
      : 'Same as Everyone’s Price';

  const embed: DiscordWebhookPayload['embeds'][number] = {
    title: `Price Drop: ${productTitle}`,
    url: productUrl,
    description: `${reason}\nWatch: **${watchLabel}**`,
    color: VERDICT_COLORS[verdict],
    fields: [
      { name: 'Everyone’s Price', value: formatInr(unconditionalPricePaise), inline: true },
      { name: 'Best Card Price', value: cardValue, inline: true },
      { name: 'Store & Verdict', value: `${retailerName} · ${verdictInfo.label}`, inline: true },
    ],
    footer: { text: 'dealHound India · Hysteresis anti-spam active' },
    timestamp: new Date().toISOString(),
  };

  if (imageUrl) {
    embed.thumbnail = { url: imageUrl };
  }

  return {
    username: 'dealHound India',
    embeds: [embed],
  };
};

export const maskDiscordWebhook = (webhookUrl: string): string => {
  const match = webhookUrl.match(/\/webhooks\/(\d+)\/([A-Za-z0-9_-]{4})/);

  if (!match) {
    return 'Discord Webhook';
  }

  return `discord.com/…/${match[1].slice(-6)}/${match[2]}••••`;
};
