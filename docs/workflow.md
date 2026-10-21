# How dealHound is built and released

The same flow as Cadence, so it carries over to the next project. Nothing deploys yet; add a deploy workflow when there is a host.

## Branches
Two long-lived branches: `develop` is where work lands, `main` is what is released. Both should be protected (changes only by PR with the CI check passing; no force-push, no deletion). Work goes on a short branch named for its prefix (`feat/theme`, `fix/...`, `chore/...`) and merges into `develop` by PR.

## A pull request
- Title: short, imperative, prefixed `feat`, `fix`, `refactor`, `docs`, `test`, `ci`, `chore` or `release`.
- Body: **What**, **Verified**, **Not done**.
- Assigned to its owner, with one label from the title's prefix: `feat` is `enhancement`, `fix` is `bug`, `docs` is `documentation`, `release` is `release`, `ci` is `ci`, `test` is `tests`, `chore` or a refactor is `chore`.
- CI (`.github/workflows/ci.yml`) runs format, lint, types, unit tests and build on every PR. `npm run verify` runs the same locally.

## Plan, spec, build
`docs/roadmap.md` says what is next. Each feature has a design in `docs/superpowers/specs/` (brainstorm first when there is none; the spec carries the task list). Tests first, then code, one PR per feature.

## Releases and tags
A version is a **tag** on a `main` commit with a GitHub pre-release (until 1.0).

1. Open a PR into `develop` that bumps `version` in `package.json` (and the lockfile) and adds a heading for it in `CHANGELOG.md` (`## 0.2.0 (2026-11-01)`), moving the features from *Planned*. Merge it.
2. Open a PR from `develop` into `main` and merge it with a **merge commit** (not squash, so the branches stay in step).
3. Tag the merge commit and publish: `git tag -a v0.2.0 <main-merge-sha> -m "..." && git push origin v0.2.0`, then `gh release create v0.2.0 --prerelease`.

A fix that cannot wait (data loss, security) goes the same way as a patch release. To go back, open a PR into `develop` that reverts the merge (`git revert -m 1 <merge-sha>`) and release it. Compare with the last tag: `git diff v0.2.0..develop`.

## Known issues and bugfix releases
Bugs are not fixed one by one. A bug becomes a GitHub issue with the **known-issue** label (the `Known issue` template). If people using the app can run into it, add a plain line to **Known issues** in `CHANGELOG.md`. A **bugfix release** (a patch version) later fixes everything with the label: each fix is a PR saying `Fixes #n`; the release removes the matching lines and closes the issues. Fixed at once: anything that loses or exposes data, and security problems.

## Labels
`enhancement`, `bug`, `documentation`, `release`, `ci`, `tests`, `chore` for PRs; `known-issue` for issues. Copy them to a new repo with the commands at the end of this file.

```
gh label create release --color 0e8a16 --description "A version release (develop into main) or its prep"
gh label create ci --color 5319e7 --description "CI and deploy workflows"
gh label create tests --color fbca04 --description "Tests only"
gh label create chore --color ededed --description "Refactors, policies and housekeeping"
gh label create known-issue --color e99695 --description "A known bug, waiting for the next bugfix release"
```
(`enhancement`, `bug` and `documentation` exist in every new GitHub repo.)
