import Link from 'next/link';

import { deleteWatchFormAction, sendTestPingFormAction, toggleWatchStateFormAction } from '@/app/actions/watch-actions';
import type { WatchRule } from '@/domain/types';
import { maskDiscordWebhook } from '@/lib/discord-webhook';
import { formatInr } from '@/lib/inr';

import './watch-card.css';

interface WatchCardProps {
  watch: WatchRule;
}

export const WatchCard = (props: WatchCardProps) => {
  const { watch } = props;
  const {
    id,
    label,
    productSlug,
    triggerMode,
    priceBasis,
    baselinePricePaise,
    targetPricePaise,
    dropPctTarget,
    lastAlertedPricePaise,
    state,
    discordWebhookUrl,
  } = watch;

  const stateClass = `watch-card__state watch-card__state--${state}`;
  const basisLabel = priceBasis === 'best_conditional' ? 'Includes Bank Offers' : 'Everyone’s Price';

  let ruleSummary = 'Any verified drop';

  if (triggerMode === 'target_price' && targetPricePaise !== undefined) {
    ruleSummary = `Target ≤ ${formatInr(targetPricePaise)}`;
  } else if (triggerMode === 'pct_drop') {
    ruleSummary = `Drop ≥ ${dropPctTarget ?? 5}% from ${formatInr(baselinePricePaise)}`;
  } else if (triggerMode === 'all_time_low') {
    ruleSummary = 'New All-Time Low';
  }

  const lowWaterText = lastAlertedPricePaise !== null ? ` · Low-water mark: ${formatInr(lastAlertedPricePaise)}` : '';

  return (
    <div className="watch-card">
      <div className="watch-card__info">
        <div className="watch-card__top">
          {productSlug ? (
            <Link href={`/product/${productSlug}`} className="watch-card__label">
              {label}
            </Link>
          ) : (
            <span className="watch-card__label">{label}</span>
          )}
          <span className={stateClass}>{state}</span>
        </div>
        <p className="watch-card__details">
          {ruleSummary} · {basisLabel} · Baseline {formatInr(baselinePricePaise)}
          {lowWaterText}
        </p>
        <span className="watch-card__webhook">{maskDiscordWebhook(discordWebhookUrl)}</span>
      </div>

      <div className="watch-card__actions">
        <form action={sendTestPingFormAction}>
          <input type="hidden" name="watchId" value={id} />
          <button type="submit" className="watch-card__btn">
            Test Discord Ping
          </button>
        </form>
        <form action={toggleWatchStateFormAction}>
          <input type="hidden" name="watchId" value={id} />
          <button type="submit" className="watch-card__btn">
            {state === 'paused' ? 'Resume' : 'Pause'}
          </button>
        </form>
        <form action={deleteWatchFormAction}>
          <input type="hidden" name="watchId" value={id} />
          <button type="submit" className="watch-card__btn watch-card__btn--danger">
            Remove
          </button>
        </form>
      </div>
    </div>
  );
};
