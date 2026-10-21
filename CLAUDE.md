# dealHound

Read `AGENTS.md` (this Next.js has breaking changes) and `docs/policies.md` (code policies, enforced by lint) before writing code. dealHound follows Cadence's conventions (`../Cadence`).

- Arrow `const` functions with block bodies, named handlers, absolute imports (`@/...`), destructure props inside components, styles in a component CSS file with `@apply` (Tailwind only, no other CSS).
- Write the failing test first. Unit tests live in `tests/unit/` (mirroring `src/`), never beside the code.
- Changes land by pull request into `develop`, never into `master`. Run `npm run lint`, `npx tsc --noEmit` and the relevant tests before raising one.
- The owner runs the dev server; do not start or stop it.
- Never commit secrets.
