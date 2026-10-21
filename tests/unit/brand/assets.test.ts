import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FONT_URLS = [...readFileSync('src/app/globals.css', 'utf8').matchAll(/url\('(\/fonts\/[^']+)'\)/g)].map(match => {
  return match[1];
});

describe('brand assets', () => {
  it('has the icon, favicon and both logo variants', () => {
    for (const file of [
      'src/app/icon.svg',
      'src/app/favicon.ico',
      'src/app/apple-icon.png',
      'public/brand/logo-light.svg',
      'public/brand/logo-dark.svg',
    ]) {
      expect(existsSync(file), file).toBe(true);
    }
  });

  it('serves the fonts from our own files, never from a CDN', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');

    expect(css).not.toMatch(/fonts\.googleapis|fonts\.gstatic|https?:\/\/[^)]*\.woff2?/);
    expect(FONT_URLS.length).toBeGreaterThanOrEqual(2);

    for (const url of FONT_URLS) {
      expect(existsSync(`public${url}`), url).toBe(true);
    }
  });

  it('keeps the font files small', () => {
    for (const url of FONT_URLS) {
      expect(readFileSync(`public${url}`).length, url).toBeLessThan(40_000);
    }
  });
});
