import { createTranslator } from 'next-intl';
import en from '@locales/en';
import { translateMsg, type Msg } from '@/lib/message';

const t = createTranslator({ locale: 'en', messages: en });

/** For tests: a message as English text, so a test can check the exact words and that the key exists. */
export const tr = (m: Msg | null): string => {
  return m === null ? '' : translateMsg(t as never, m);
};
