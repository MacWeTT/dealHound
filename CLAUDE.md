# dealHound

Read `AGENTS.md` (this Next.js has breaking changes) and `docs/policies.md` (code policies, enforced by lint) before writing code. dealHound follows Cadence's conventions (`../Cadence`); the way of working is in `docs/workflow.md`.

- Arrow `const` functions with block bodies, named handlers, absolute imports (`@/...`), destructure props inside components, styles in a component CSS file with `@apply` (Tailwind only, no other CSS).
- Write the failing test first. Unit tests live in `tests/unit/` (mirroring `src/`), never beside the code.
- Changes land by pull request into `develop`, never into `main` (releases only). Run `npm run lint`, `npx tsc --noEmit` and the relevant tests before raising one; CI runs the full gate on the PR, so do not repeat it locally unless the change is wide or risky.
- The owner runs the dev server; do not start or stop it.
- Never commit secrets or put them in chat.

## How we work

- The owner mostly merges after CI passes and does not read the code, so tests carry the weight: every feature ships with unit tests. Small bugs found later are filed as `known-issue` issues and fixed together in a bugfix release.
- Start from the plan: `docs/roadmap.md` says what is next, `docs/superpowers/specs/` holds the design of each feature (the spec carries the task list; no separate plan file). Brainstorm only when there is no spec yet.
- One PR per feature (a stack only when it is too big to review). The version bump and the changelog entry go in the feature's last PR. A release is one `develop` to `main` PR (merge commit), followed by the tag and a GitHub pre-release. Update the roadmap once per release.
- Check lightly: write files once, run `eslint --fix` and `prettier --write` on what changed, run the relevant tests only. Look at the app once, on a production build, when the change is visual (the dev server can serve stale CSS). Keep command output short.
- Do not start, stop or restart the dev server. A production build on another port is fine if it is stopped afterwards.
