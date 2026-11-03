'use client';

import { type ChangeEvent, useActionState, useState } from 'react';

import { createWatchFormAction, type WatchActionState } from '@/app/actions/watch-actions';
import type { PaymentInstrument, WatchTriggerMode } from '@/domain/types';
import { serializeWalletParam } from '@/lib/wallet-query';

import './watch-form.css';

interface WatchFormProps {
  defaultLabel: string;
  productSlug?: string;
  specQueryText?: string;
  suggestedTargetRupees: number;
  selectedCards?: PaymentInstrument[];
}

interface WatchFormUiState {
  triggerMode: WatchTriggerMode;
}

const INITIAL_ACTION_STATE: WatchActionState = {
  status: 'idle',
  message: '',
};

export const WatchForm = (props: WatchFormProps) => {
  const { defaultLabel, productSlug, specQueryText, suggestedTargetRupees, selectedCards = [] } = props;

  const [uiState, setUiState] = useState<WatchFormUiState>({
    triggerMode: 'target_price',
  });
  const [actionState, formAction, isPending] = useActionState(createWatchFormAction, INITIAL_ACTION_STATE);

  const onTriggerModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setUiState({ triggerMode: event.target.value as WatchTriggerMode });
  };

  const { triggerMode } = uiState;
  const { status, message } = actionState;
  const serializedCards = serializeWalletParam(selectedCards) ?? '';
  const heading = productSlug ? 'Ping My Discord When This Product Drops' : 'Watch This Spec Across Indian Stores';

  return (
    <form action={formAction} className="watch-form">
      <div>
        <h3 className="watch-form__title">{heading}</h3>
        <p className="watch-form__subtitle">
          Low-water-mark hysteresis suppresses flat-price spam and only re-pings on ≥2% deeper lows.
        </p>
      </div>

      <input type="hidden" name="label" value={defaultLabel} />
      {productSlug ? <input type="hidden" name="productSlug" value={productSlug} /> : null}
      {specQueryText ? <input type="hidden" name="specQueryText" value={specQueryText} /> : null}
      <input type="hidden" name="walletCards" value={serializedCards} />

      <div className="watch-form__grid">
        <div className="watch-form__field">
          <label htmlFor="triggerMode" className="watch-form__label">
            Alert Trigger
          </label>
          <select
            id="triggerMode"
            name="triggerMode"
            value={triggerMode}
            onChange={onTriggerModeChange}
            className="watch-form__input"
          >
            <option value="target_price">Target Price (≤ ₹)</option>
            <option value="pct_drop">Percentage Drop (≥ %)</option>
            <option value="all_time_low">New All-Time Low</option>
            <option value="any_drop">Any Verified Drop</option>
          </select>
        </div>

        <div className="watch-form__field">
          <label htmlFor="priceBasis" className="watch-form__label">
            Price Basis
          </label>
          <select id="priceBasis" name="priceBasis" defaultValue="unconditional" className="watch-form__input">
            <option value="unconditional">Everyone’s Price (No card required)</option>
            <option value="best_conditional">Include Bank Card Offers</option>
          </select>
        </div>
      </div>

      {triggerMode === 'target_price' ? (
        <div className="watch-form__field">
          <label htmlFor="targetInr" className="watch-form__label">
            Target Price in ₹ (supports e.g. 85000, 86k, 1.05 lakh)
          </label>
          <input
            id="targetInr"
            name="targetInr"
            type="text"
            defaultValue={String(suggestedTargetRupees)}
            className="watch-form__input"
            required
          />
        </div>
      ) : null}

      {triggerMode === 'pct_drop' ? (
        <div className="watch-form__field">
          <label htmlFor="dropPct" className="watch-form__label">
            Minimum Drop Percentage (%)
          </label>
          <input
            id="dropPct"
            name="dropPct"
            type="number"
            min="2"
            max="70"
            defaultValue="5"
            className="watch-form__input"
          />
        </div>
      ) : null}

      <div className="watch-form__field">
        <label htmlFor="discordWebhookUrl" className="watch-form__label">
          Discord Channel Webhook URL
        </label>
        <input
          id="discordWebhookUrl"
          name="discordWebhookUrl"
          type="url"
          placeholder="https://discord.com/api/webhooks/..."
          className="watch-form__input"
          required
        />
      </div>

      {status === 'created' ? <p className="watch-form__feedback-ok">{message}</p> : null}
      {status === 'error' ? <p className="watch-form__feedback-err">{message}</p> : null}

      <button type="submit" disabled={isPending} className="watch-form__submit">
        {isPending ? 'Arming Discord Watch...' : 'Arm Discord Price Watch'}
      </button>
    </form>
  );
};
