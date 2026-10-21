import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEVELOPER, VERSION } from '@/lib/site';

describe('site', () => {
  it('shows the version written in package.json', () => {
    const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

    expect(VERSION).toBe(version);
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('credits the primary contributor with their GitHub page', () => {
    expect(DEVELOPER).toEqual({ name: 'MacWeTT', url: 'https://github.com/MacWeTT' });
  });
});
