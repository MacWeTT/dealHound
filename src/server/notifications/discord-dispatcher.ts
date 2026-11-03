import 'server-only';

import { type DiscordWebhookPayload, validateDiscordWebhookUrl } from '@/lib/discord-webhook';

export type WebhookFetchFn = typeof fetch;

export interface DispatchResult {
  ok: boolean;
  statusCode?: number;
  error?: string;
}

export const dispatchDiscordWebhook = async (
  webhookUrl: string,
  payload: DiscordWebhookPayload,
  fetchFn: WebhookFetchFn = fetch,
): Promise<DispatchResult> => {
  const { ok: validUrl, normalizedUrl, error } = validateDiscordWebhookUrl(webhookUrl);

  if (!validUrl || !normalizedUrl) {
    return { ok: false, error: error ?? 'Invalid Discord webhook URL.' };
  }

  try {
    const response = await fetchFn(normalizedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    const { ok, status } = response;

    if (!ok) {
      return { ok: false, statusCode: status, error: `Discord returned HTTP ${status}.` };
    }

    return { ok: true, statusCode: status };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error sending Discord webhook.';

    return { ok: false, error: message };
  }
};
