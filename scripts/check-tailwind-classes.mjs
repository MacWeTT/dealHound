// Fails when a Tailwind class has a shorter canonical spelling, the same advice the editor extension shows
// ("`size-[var(--x)]` can be written as `size-(--x)`"). Checks every `@apply` in the CSS and every class string in the
// components. Run by `npm run lint`.
import fs from 'node:fs';
import path from 'node:path';
import { __unstable__loadDesignSystem as loadDesignSystem } from '@tailwindcss/node';

const walk = dir => {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);

    return entry.isDirectory() ? walk(full) : [full];
  });
};

const files = walk('src').filter(f => {
  return /\.(css|tsx)$/.test(f);
});

const entry = 'src/app/globals.css';
const designSystem = await loadDesignSystem(fs.readFileSync(entry, 'utf8'), { base: path.dirname(path.resolve(entry)) });

const problems = [];

/** Every class-like token inside `text`, with the line it is on. */
const check = (file, text, offsetLine) => {
  const tokens = text.split(/\s+/).filter(Boolean);
  const canonical = designSystem.canonicalizeCandidates(tokens);

  tokens.forEach((token, i) => {
    if (canonical[i] !== token) {
      problems.push(`${file}:${offsetLine}  ${token}  ->  ${canonical[i]}`);
    }
  });
};

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');

  if (file.endsWith('.css')) {
    for (const match of source.matchAll(/@apply\s+([^;]+);/g)) {
      check(file, match[1], source.slice(0, match.index).split('\n').length);
    }

    continue;
  }

  if (file.includes(`${path.sep}ui${path.sep}`)) {
    continue; // generated shadcn files
  }

  for (const match of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})|cn\(\s*'([^']*)'/g)) {
    check(file, match[1] ?? match[2] ?? match[3] ?? '', source.slice(0, match.index).split('\n').length);
  }
}

if (problems.length > 0) {
  console.error(`Tailwind classes with a shorter canonical spelling (${problems.length}):\n${problems.join('\n')}`);
  process.exit(1);
}

console.log('Tailwind classes are canonical.');
