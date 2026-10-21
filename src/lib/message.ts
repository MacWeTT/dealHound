import type { MessageKeys, NestedKeyOf } from 'next-intl';
import type en from '@locales/en';

type Messages = typeof en;

/** A key of the message files, written as `file.path.to.message` (for example `alert.doNow`). Checked by the typecheck. */
export type MessageKey = MessageKeys<Messages, NestedKeyOf<Messages>>;

/** A message value can be another message (for example a time inside a sentence). */
export type MsgValue = string | number | Msg;

/**
 * A sentence that is not translated yet: which message, and what fills its gaps. Pure code (rules, helpers) returns
 * these so it can be tested without a language; the UI turns them into text.
 */
export interface Msg {
  key: MessageKey;
  values?: Record<string, MsgValue>;
}

export const msg = (key: MessageKey, values?: Record<string, MsgValue>): Msg => {
  return { key, values };
};

/** What `useTranslations()` and `getTranslations()` return, loosened so one function can translate any key. */
type Translator = (key: never, values?: never) => string;

/** Turns a message into text, translating any messages nested in its values first. */
export const translateMsg = (t: Translator, m: Msg): string => {
  const { key, values: nested } = m;
  const values: Record<string, string | number> = {};

  for (const [name, value] of Object.entries(nested ?? {})) {
    values[name] = typeof value === 'object' ? translateMsg(t, value) : value;
  }

  return (t as unknown as (key: string, values?: Record<string, string | number>) => string)(key, values);
};
