import '@/app/search/page.css';
import { ProductCard } from '@/components/product-card/product-card';
import { SearchOmnibox } from '@/components/search-omnibox/search-omnibox';
import { WalletSelector } from '@/components/wallet-selector/wallet-selector';
import { WatchForm } from '@/components/watch-form/watch-form';
import { formatInr } from '@/lib/inr';
import { parseWalletFromParam } from '@/lib/wallet-query';
import { defaultDealService } from '@/server/services/deal-service';

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const SearchPage = async (props: SearchPageProps) => {
  const { searchParams } = props;
  const resolvedParams = await searchParams;
  const { q: rawQ, cards } = resolvedParams;
  const query = typeof rawQ === 'string' ? rawQ : '';
  const wallet = parseWalletFromParam(cards);
  const selectedCards = wallet ? wallet.instruments : [];

  const result = await defaultDealService.searchDeals(query, wallet);
  const { parsedInput, items } = result;
  const itemCount = items.length;

  const intentTags: string[] = [];

  if (parsedInput.kind === 'url') {
    const { retailerId, externalId } = parsedInput;

    intentTags.push(`Store URL: ${retailerId}`);

    if (externalId) {
      intentTags.push(`SKU: ${externalId}`);
    }
  } else {
    const { specs, maxBudgetPaise } = parsedInput;
    const { brand, gpu, cpu, ramGb, storageGb, mpn } = specs;

    if (brand) {
      intentTags.push(`Brand: ${brand.toUpperCase()}`);
    }

    if (gpu) {
      intentTags.push(`GPU: ${gpu.toUpperCase()}`);
    }

    if (cpu) {
      intentTags.push(`CPU: ${cpu.toUpperCase()}`);
    }

    if (ramGb !== undefined) {
      intentTags.push(`RAM ≥ ${ramGb}GB`);
    }

    if (storageGb !== undefined) {
      intentTags.push(`Storage ≥ ${storageGb}GB`);
    }

    if (mpn) {
      intentTags.push(`MPN: ${mpn}`);
    }

    if (maxBudgetPaise !== undefined) {
      intentTags.push(`Budget ≤ ${formatInr(maxBudgetPaise)}`);
    }
  }

  const lowestGroupPrice = items[0]?.group.bestUnconditionalOffer.pricing.unconditionalPricePaise ?? 8_800_000;
  const suggestedRupees = Math.round((lowestGroupPrice * 0.96) / 100 / 500) * 500;

  return (
    <main className="search-page">
      <section className="search-page__controls">
        <SearchOmnibox defaultQuery={query} selectedCards={selectedCards} showQuickChips />
        <WalletSelector basePath="/search" query={query} selectedCards={selectedCards} />
        {intentTags.length > 0 ? (
          <div className="search-page__intent">
            <span className="search-page__intent-label">Parsed Spec Filter:</span>
            {intentTags.map(tag => {
              return (
                <span key={tag} className="search-page__intent-tag">
                  {tag}
                </span>
              );
            })}
          </div>
        ) : null}
      </section>

      <p className="search-page__summary">
        Found {itemCount} canonical Indian product {itemCount === 1 ? 'group' : 'groups'}
        {query ? ` for “${query}”` : ''} (accessories &amp; mismatched variants excluded).
      </p>

      {itemCount > 0 ? (
        <div className="search-page__grid">
          {items.map(entry => {
            const { group, history } = entry;

            return <ProductCard key={group.slug} group={group} history={history} selectedCards={selectedCards} />;
          })}
        </div>
      ) : (
        <div className="search-page__empty">
          No exact Indian store matches yet. Paste a direct Amazon.in / Flipkart / MDComputers product URL above or arm
          a Spec Watch below to get pinged on Discord when one drops into range.
        </div>
      )}

      {query && parsedInput.kind === 'query' ? (
        <WatchForm
          defaultLabel={`Spec Watch: ${query}`}
          specQueryText={query}
          suggestedTargetRupees={suggestedRupees}
          selectedCards={selectedCards}
        />
      ) : null}
    </main>
  );
};

export default SearchPage;
