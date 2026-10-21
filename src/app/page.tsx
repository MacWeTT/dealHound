import { getTranslations } from 'next-intl/server';
import { SearchBar } from '@/components/search-bar/search-bar';
import { LogoMark } from '@/components/logo-mark/logo-mark';
import '@/app/page.css';

const HomePage = async () => {
  const t = await getTranslations('home');

  return (
    <main className="home">
      <LogoMark />
      <h1 className="home__title">
        {t('titleDeal')}
        <span className="home__title-hound">{t('titleHound')}</span>
      </h1>
      <p className="home__tagline">{t('tagline')}</p>
      <SearchBar />
    </main>
  );
};

export default HomePage;
