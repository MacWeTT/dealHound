type ShortcutEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'target'>;

const TYPING_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

/** Pressing `/` on the page jumps to the search bar, unless the person is already typing somewhere. */
export const isSearchShortcut = (event: ShortcutEvent): boolean => {
  const { key, ctrlKey, metaKey, altKey, target } = event;
  const { tagName = '', isContentEditable = false } = (target ?? {}) as {
    tagName?: string;
    isContentEditable?: boolean;
  };

  if (key !== '/' || ctrlKey || metaKey || altKey) {
    return false;
  }

  return !TYPING_TAGS.includes(tagName) && !isContentEditable;
};
