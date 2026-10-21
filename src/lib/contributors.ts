/**
 * The GitHub usernames of everyone who has helped build dealHound (no real names). The first is the primary contributor
 * and the owner. To be listed, add your username at the end in your pull request.
 */
export const CONTRIBUTORS: string[] = ['MacWeTT'];

/** Where a contributor is found: their GitHub page. */
export const githubUrl = (username: string): string => {
  return `https://github.com/${username}`;
};
