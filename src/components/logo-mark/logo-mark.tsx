import { useTranslations } from 'next-intl';
import { MARK_SHAPES, MARK_VIEWBOX } from '@/components/logo-mark/logo-mark-shapes';
import './logo-mark.css';

/** The wolf on its own, no tile (the tile is only for the favicon). Its height comes from `--mark-size` on the parent. */
export const LogoMark = () => {
  const t = useTranslations('common');

  return (
    <svg role="img" aria-label={t('brand')} viewBox={MARK_VIEWBOX} className="logo-mark">
      {MARK_SHAPES.map(({ points, fill }) => {
        return (
          <polygon
            key={`${points}-${fill}`}
            points={points}
            fill={fill}
            stroke={fill}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
};
