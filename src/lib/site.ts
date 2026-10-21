import { version } from '@package';
import { CONTRIBUTORS, githubUrl } from '@/lib/contributors';

/** Who builds dealHound, and where to reach them: the primary contributor. */
export const DEVELOPER = { name: CONTRIBUTORS[0], url: githubUrl(CONTRIBUTORS[0]) };

/**
 * The version, read from package.json itself, so the footer always shows the number in the file. It stays 0.1.x until
 * something working is released. Server components only: importing this from a client component would put all of
 * package.json in the browser's bundle.
 */
export const VERSION = version;
