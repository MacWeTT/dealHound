import { describe, expect, it } from 'vitest';
import { BOOT_SCRIPT, THEME_KEY } from '@/lib/theme';

/** Runs the boot script against a fake page and returns whether it put `dark` on <html>. */
const bootsDark = (saved: string | null, systemDark: boolean) => {
  const classes = new Set<string>();
  const root = {
    classList: {
      toggle: (name: string, on: boolean) => {
        return on ? classes.add(name) : classes.delete(name);
      },
    },
  };
  const storage = {
    getItem: (key: string) => {
      return key === THEME_KEY ? saved : null;
    },
  };

  const matchMedia = () => {
    return { matches: systemDark };
  };

  new Function('document', 'localStorage', 'matchMedia', BOOT_SCRIPT)({ documentElement: root }, storage, matchMedia);

  return classes.has('dark');
};

describe('BOOT_SCRIPT', () => {
  it('follows the system when nothing is saved', () => {
    expect(bootsDark(null, true)).toBe(true);
    expect(bootsDark(null, false)).toBe(false);
  });

  it('prefers the saved choice over the system', () => {
    expect(bootsDark('light', true)).toBe(false);
    expect(bootsDark('dark', false)).toBe(true);
  });
});
