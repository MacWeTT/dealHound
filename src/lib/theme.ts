export const THEME_KEY = 'theme';

/**
 * Runs in <head> before the first paint: puts `dark` on <html> from the saved choice, else from the system setting.
 * Written by hand because next-themes renders its script inside a component, which React 19 warns about.
 * shortcut: the page does not follow the system setting while open, upgrade if that matters.
 */
export const BOOT_SCRIPT = `try{var s=localStorage.getItem('${THEME_KEY}');document.documentElement.classList.toggle('dark',s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches)}catch(e){}`;
