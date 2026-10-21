import { describe, expect, it } from 'vitest';
import { isSearchShortcut } from '@/lib/search-shortcut';

const press = (key: string, target: object | null = { tagName: 'BODY' }, mods = {}) => {
  return { key, ctrlKey: false, metaKey: false, altKey: false, target, ...mods } as Parameters<
    typeof isSearchShortcut
  >[0];
};

describe('isSearchShortcut', () => {
  it('is the slash key pressed on the page', () => {
    expect(isSearchShortcut(press('/'))).toBe(true);
  });

  it('ignores other keys', () => {
    expect(isSearchShortcut(press('a'))).toBe(false);
  });

  it('ignores the slash while typing in a field', () => {
    expect(isSearchShortcut(press('/', { tagName: 'INPUT' }))).toBe(false);
    expect(isSearchShortcut(press('/', { tagName: 'TEXTAREA' }))).toBe(false);
    expect(isSearchShortcut(press('/', { tagName: 'DIV', isContentEditable: true }))).toBe(false);
  });

  it('ignores the slash with a modifier held', () => {
    expect(isSearchShortcut(press('/', undefined, { ctrlKey: true }))).toBe(false);
    expect(isSearchShortcut(press('/', undefined, { metaKey: true }))).toBe(false);
  });
});
