import { describe, expect, it } from 'vitest';
import { CONTRIBUTORS, githubUrl } from '@/lib/contributors';

describe('CONTRIBUTORS', () => {
  it('lists at least the primary contributor, first', () => {
    expect(CONTRIBUTORS.length).toBeGreaterThanOrEqual(1);
    expect(CONTRIBUTORS[0]).toBe('MacWeTT');
  });

  it('holds valid GitHub usernames, and nobody twice', () => {
    for (const username of CONTRIBUTORS) {
      expect(username).toMatch(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/);
    }

    const lower = CONTRIBUTORS.map(username => {
      return username.toLowerCase();
    });

    expect(new Set(lower).size).toBe(lower.length);
  });
});

describe('githubUrl', () => {
  it('points at the GitHub page of a username', () => {
    expect(githubUrl('MacWeTT')).toBe('https://github.com/MacWeTT');
  });
});
