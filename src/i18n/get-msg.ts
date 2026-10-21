import { getTranslations } from 'next-intl/server';
import { translateMsg, type Msg } from '@/lib/message';

/** In async server components and server actions: `const tm = await getMsg();` then `tm(someMessage)`. */
export const getMsg = async () => {
  const t = await getTranslations();

  return (m: Msg) => {
    return translateMsg(t, m);
  };
};
