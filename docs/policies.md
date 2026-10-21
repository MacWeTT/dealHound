# dealHound code policies

Same norms as Cadence (`../Cadence/docs/policies.md`), enforced by `eslint.config.mjs`. Every file in `src/` and `tests/` follows them, written by a person or an agent. Run `npm run verify` before opening a PR.

Differences for now:
- **No localisation yet.** Cadence's rule 8 (text from message files via `next-intl`) is not enforced; user-facing text is written in the component. Add it when a second language or real copy volume arrives.
- **No `e2e/` and no database.** Playwright and Supabase come with the first feature that needs them.

## Style
1. Arrow functions with a block body and explicit `return`; braces on every `if`/`else`/`for`/`while`.
2. Components take `props` and destructure inside the body; the props type is named (`interface XProps`).
3. One `useState` holding an object.
4. Blank lines separate blocks of logic.
5. Order inside a component: state, then queries, then everything else.
6. `const fn = params => { ... }`; no `function` declarations.
7. Class names in JSX, styles in a CSS file with `@apply` (BEM, prefixed by the component name; start the file with `@reference` to `globals.css`). One folder per component holding `x.tsx` and `x.css`. Tailwind classes in canonical form (checked by `scripts/check-tailwind-classes.mjs`). Class names never start with a Tailwind utility word (`text-`, `bg-`, ...).
9. No anonymous functions as props; name the handler above the `return`.
10. Absolute imports (`@/...`, `@tests/...`); a component's own stylesheet is the only relative import.
11. Read an object's properties once; destructure when read two or more times.

## Architecture
- `src/domain/`: plain TypeScript (matching, price rules, effective-price maths). No React, Next or database.
- `src/lib/*.ts`: shared helpers; no imports from `src/server` or `src/app`.
- Code that must not reach the browser starts with `import 'server-only'`.
- Files stay under 250 lines. File names are kebab-case; components PascalCase; one component per file.

## Testing
- Failing test first. Unit tests live in `tests/unit/`, mirroring `src/`; never beside the code.
- Tests assert behaviour, not implementation. A flaky test is fixed or deleted.

## Process
- Changes land by pull request into `develop`; `main` is for releases (the live branch).
- Commit messages are short, imperative, prefixed `feat`, `fix`, `refactor`, `docs`, `test` or `chore`.
- Shortcuts with a known limit are marked `shortcut: <the limit>, <when to upgrade>`.
- A PR has **What**, **Verified** and **Not done** sections, and reports anything skipped or unchecked. It is assigned to its owner and carries one label (see `AGENTS.md`).
- Releases, tags and known issues are in `docs/workflow.md`.
