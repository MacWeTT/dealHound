import { useTranslations } from 'next-intl';
import { DEVELOPER, VERSION } from '@/lib/site';
import './footer.css';

/** The foot of every page: who builds dealHound, and which version this is. */
export const Footer = () => {
  const t = useTranslations('footer');

  const { name, url } = DEVELOPER;

  return (
    <footer className="footer">
      <p>
        {t('developedBy')}{' '}
        <a href={url} target="_blank" rel="noreferrer" className="footer__link">
          {name}
        </a>
      </p>
      <p className="footer__version">{t('version', { version: VERSION })}</p>
    </footer>
  );
};
