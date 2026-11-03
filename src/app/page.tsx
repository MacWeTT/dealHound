import '@/app/page.css';
import { ProductCard } from '@/components/product-card/product-card';
import { SearchOmnibox } from '@/components/search-omnibox/search-omnibox';
import { WalletSelector } from '@/components/wallet-selector/wallet-selector';
import { parseWalletFromParam } from '@/lib/wallet-query';
import { defaultDealService } from '@/server/services/deal-service';

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const HomePage = async (props: HomePageProps) => {
  const { searchParams } = props;
  const resolvedParams = await searchParams;
  const wallet = parseWalletFromParam(resolvedParams.cards);
  const selectedCards = wallet ? wallet.instruments : [];
  const featured = defaultDealService.getFeaturedDeals(wallet);

  return (
    <main className="home">
      <section className="home__hero">
        <span className="home__eyebrow">India Multi-Store Price Engine</span>
        <h1 className="home__title">Search once, track every price, get pinged when it drops.</h1>
        <p className="home__tagline">
          Compare true net INR prices across Amazon.in, Flipkart, MDComputers, Croma, Vijay Sales &amp; more — factoring
          store coupons, ₹99 platform fees, and bank card caps without pre-sale hike tricks.
        </p>
        <SearchOmnibox selectedCards={selectedCards} showQuickChips />
        <WalletSelector basePath="/" selectedCards={selectedCards} />
      </section>

      <section className="home__section">
        <div className="home__section-head">
          <h2 className="home__section-title">Tracked Indian Tech Drops</h2>
          <span className="home__section-note">Sorted by lowest unconditional Everyone’s Price</span>
        </div>
        <div className="home__grid">
          {featured.map(item => {
            const { group, history } = item;

            return <ProductCard key={group.slug} group={group} history={history} selectedCards={selectedCards} />;
          })}
        </div>
      </section>
    </main>
  );
};

export default HomePage;
