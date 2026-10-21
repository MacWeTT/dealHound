import '@/app/page.css';

const HomePage = () => {
  return (
    <main className="home">
      <h1 className="home__title">dealHound</h1>
      <p className="home__tagline">Search once, track every price, get pinged when it drops.</p>
      <input className="home__search" type="search" placeholder="Search a product, e.g. RTX 5060 laptop" disabled />
    </main>
  );
};

export default HomePage;
