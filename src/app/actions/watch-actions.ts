'use server';

import { revalidatePath } from 'next/cache';

import { extractSpecsFromText } from '@/domain/spec-extractor';
import type { PaymentInstrument, WatchPriceBasis, WatchTriggerMode } from '@/domain/types';
import { parseInrToPaise } from '@/lib/inr';
import { parseWalletFromParam } from '@/lib/wallet-query';
import { defaultDealService } from '@/server/services/deal-service';

export interface WatchActionState {
  status: 'idle' | 'created' | 'error';
  message: string;
}

const VALID_TRIGGER_MODES = new Set<string>(['target_price', 'pct_drop', 'any_drop', 'all_time_low', 'restock']);

export const createWatchFormAction = async (
  _prevState: WatchActionState,
  formData: FormData,
): Promise<WatchActionState> => {
  const label = String(formData.get('label') ?? '').trim();
  const productSlugRaw = String(formData.get('productSlug') ?? '').trim();
  const specQueryRaw = String(formData.get('specQueryText') ?? '').trim();
  const triggerRaw = String(formData.get('triggerMode') ?? 'target_price');
  const basisRaw = String(formData.get('priceBasis') ?? 'unconditional');
  const targetRupeesRaw = String(formData.get('targetInr') ?? '').trim();
  const dropPctRaw = Number(formData.get('dropPct') ?? '5');
  const discordWebhookUrl = String(formData.get('discordWebhookUrl') ?? '').trim();
  const cardsRaw = String(formData.get('walletCards') ?? '').trim();

  const triggerMode: WatchTriggerMode = VALID_TRIGGER_MODES.has(triggerRaw)
    ? (triggerRaw as WatchTriggerMode)
    : 'target_price';
  const priceBasis: WatchPriceBasis = basisRaw === 'best_conditional' ? 'best_conditional' : 'unconditional';

  let targetPricePaise: number | undefined;

  if (triggerMode === 'target_price') {
    const parsedTarget = parseInrToPaise(targetRupeesRaw);

    if (parsedTarget === null) {
      return {
        status: 'error',
        message: 'Enter a valid target price in INR (e.g. 85000, 88k, or 1.05 lakh).',
      };
    }

    targetPricePaise = parsedTarget;
  }

  const wallet = parseWalletFromParam(cardsRaw);
  const walletInstruments: PaymentInstrument[] = wallet ? wallet.instruments : [];
  const productSlug = productSlugRaw || undefined;
  const specQuery = !productSlug && specQueryRaw ? extractSpecsFromText(specQueryRaw) : undefined;

  if (!productSlug && !specQuery) {
    return {
      status: 'error',
      message: 'Specify either a product or a search spec to watch.',
    };
  }

  const created = await defaultDealService.createWatch({
    label: label || specQueryRaw || productSlugRaw,
    productSlug,
    specQuery,
    triggerMode,
    priceBasis,
    targetPricePaise,
    dropPctTarget: Number.isFinite(dropPctRaw) && dropPctRaw > 0 ? dropPctRaw : 5,
    discordWebhookUrl,
    walletInstruments,
  });

  if (!created.ok) {
    return { status: 'error', message: created.error };
  }

  if (productSlug) {
    revalidatePath(`/product/${productSlug}`);
  }

  revalidatePath('/watches');
  revalidatePath('/');

  return {
    status: 'created',
    message: 'Discord watch armed! Hysteresis anti-spam protection is active.',
  };
};

export const toggleWatchStateFormAction = async (formData: FormData): Promise<void> => {
  const watchId = String(formData.get('watchId') ?? '');

  if (watchId) {
    defaultDealService.toggleWatchPause(watchId);
    revalidatePath('/watches');
  }
};

export const deleteWatchFormAction = async (formData: FormData): Promise<void> => {
  const watchId = String(formData.get('watchId') ?? '');

  if (watchId) {
    defaultDealService.removeWatch(watchId);
    revalidatePath('/watches');
    revalidatePath('/');
  }
};

export const sendTestPingFormAction = async (formData: FormData): Promise<void> => {
  const watchId = String(formData.get('watchId') ?? '');

  if (watchId) {
    await defaultDealService.sendTestPingForWatch(watchId);
    revalidatePath('/watches');
  }
};

export const runManualPollFormAction = async (): Promise<void> => {
  await defaultDealService.pollActiveWatches();
  revalidatePath('/watches');
};

