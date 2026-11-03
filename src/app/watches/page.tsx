import Link from 'next/link';

import { runManualPollFormAction } from '@/app/actions/watch-actions';
import '@/app/watches/page.css';
import { WatchCard } from '@/components/watch-card/watch-card';
import { defaultDealService } from '@/server/services/deal-service';

export const dynamic = 'force-dynamic';

const WatchesPage = () => {
  const { watches, outbox } = defaultDealService.listWatchesAndOutbox();
  const recentOutbox = outbox.slice(-8).reverse();

  return (
    <main className="watches-page">
      <section className="watches-page__header">
        <div>
          <h1 className="watches-page__title">Discord Price Watches</h1>
          <p className="watches-page__subtitle">
            Demand-driven poller evaluates active watches and dispatches idempotent Discord embeds via transactional
            outbox.
          </p>
        </div>

        <form action={runManualPollFormAction}>
          <button type="submit" className="watches-page__poll-btn">
            Evaluate Active Watches Now
          </button>
        </form>
      </section>

      {watches.length > 0 ? (
        <div className="watches-page__list">
          {watches.map(watch => {
            return <WatchCard key={watch.id} watch={watch} />;
          })}
        </div>
      ) : (
        <div className="watches-page__empty">
          No Discord price watches armed yet. Browse <Link href="/search?q=RTX+5060+laptop">RTX 5060 laptops</Link> or
          open any product comparison page to arm your first watch.
        </div>
      )}

      {recentOutbox.length > 0 ? (
        <section className="watches-page__outbox">
          <h2 className="watches-page__outbox-title">Recent Discord Outbox Log</h2>
          {recentOutbox.map(record => {
            const { id, status, attempts, createdAt, payload } = record;
            const alertTitle = payload.embeds[0]?.title ?? 'Price Alert';

            return (
              <div key={id} className="watches-page__outbox-row">
                <span>{alertTitle}</span>
                <span>
                  Status: <strong>{status.toUpperCase()}</strong> · Attempts: {attempts} · {createdAt.slice(0, 16)}Z
                </span>
              </div>
            );
          })}
        </section>
      ) : null}
    </main>
  );
};

export default WatchesPage;
