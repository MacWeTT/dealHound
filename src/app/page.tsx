import { getTranslations } from 'next-intl/server';
import '@/app/page.css';

const HomePage = async () => {
  const tc = await getTranslations('common');
  const t = await getTranslations('home');

  return (
    <main className="home">
      <h1 className="home__title">{tc('brand')}</h1>
      <p className="home__tagline">{t('tagline')}</p>
      <input className="home__search" type="search" placeholder={t('searchPlaceholder')} disabled />
    </main>
  );
};

export default HomePage;
