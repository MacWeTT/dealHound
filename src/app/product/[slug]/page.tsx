import Link from 'next/link';
import { notFound } from 'next/navigation';

import '@/app/product/[slug]/page.css';
import { OfferTable } from '@/components/offer-table/offer-table';
import { PriceStepChart } from '@/components/price-step-chart/price-step-chart';
import { WalletSelector } from '@/components/wallet-selector/wallet-selector';
import { WatchForm } from '@/components/watch-form/watch-form';
import { formatInr } from '@/lib/inr';
import { buildSearchHref, parseWalletFromParam } from '@/lib/wallet-query';
import { defaultDealService } from '@/server/services/deal-service';

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const ProductDetailPage = async (props: ProductDetailPageProps) => {
  const { params, searchParams } = props;
  const { slug } = await params;
  const resolvedSearch = await searchParams;
  const wallet = parseWalletFromParam(resolvedSearch.cards);
  const selectedCards = wallet ? wallet.instruments : [];

  const detail = defaultDealService.getProductDetail(slug, wallet);

  if (!detail) {
    notFound();
  }

  const { group, history, chart } = detail;
  const { canonicalTitle, offers, bestUnconditionalOffer, bestConditionalOffer } = group;
  const offerCount = offers.length;
  const { id: bestUncondId, retailerName: uncondStore, pricing: uncondPricing } = bestUnconditionalOffer;
  const { id: bestCondId, retailerName: condStore, pricing: condPricing } = bestConditionalOffer;
  const { unconditionalPricePaise } = uncondPricing;
  const { bestConditionalPricePaise, selectedPaymentLabel } = condPricing;

  const suggestedTargetRupees = Math.round((unconditionalPricePaise * 0.96) / 100 / 500) * 500;
  const cardHeading =
    selectedCards.length > 0 ? 'Best Net Price With Your Selected Cards' : 'Best Net Price With Bank Offer';

  return (
    <main className="product-page">
      <Link href={buildSearchHref('', selectedCards)} className="product-page__back">
        ← Back to Indian Catalog
      </Link>

      <section className="product-page__hero">
        <h1 className="product-page__title">{canonicalTitle}</h1>
        <WalletSelector basePath={`/product/${slug}`} selectedCards={selectedCards} />

        <div className="product-page__summary-grid">
          <div className="product-page__price-box">
            <span className="product-page__price-label">Lowest Everyone’s Price (No card required)</span>
            <span className="product-page__price-value">{formatInr(unconditionalPricePaise)}</span>
            <span className="product-page__price-sub">
              at {uncondStore} (includes mandatory fees &amp; store coupons)
            </span>
          </div>

          <div className="product-page__price-box">
            <span className="product-page__price-label">{cardHeading}</span>
            <span className="product-page__price-card">{formatInr(bestConditionalPricePaise)}</span>
            <span className="product-page__price-sub">
              {bestConditionalPricePaise < unconditionalPricePaise
                ? `at ${condStore} · ${selectedPaymentLabel ?? 'Card offer'}`
                : `Same as Everyone’s Price (${uncondStore})`}
            </span>
          </div>
        </div>
      </section>

      <section className="product-page__section">
        <h2 className="product-page__section-title">
          Side-by-Side Indian Store Breakdown ({offerCount} {offerCount === 1 ? 'store' : 'stores'})
        </h2>
        <OfferTable offers={offers} bestUnconditionalId={bestUncondId} bestConditionalId={bestCondId} />
      </section>

      <PriceStepChart history={history} chart={chart} />

      <WatchForm
        defaultLabel={canonicalTitle}
        productSlug={slug}
        suggestedTargetRupees={suggestedTargetRupees}
        selectedCards={selectedCards}
      />
    </main>
  );
};

export default ProductDetailPage;
