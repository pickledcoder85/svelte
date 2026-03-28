# AGENTS.md

This repository is expected to be developed with disciplined software engineering practices.

## Branching

- Start each feature or fix from a fresh branch named `feature/<scope>` or `fix/<scope>`.
- Keep `main` releasable.
- Rebase or merge from `main` frequently to avoid long-lived divergence.
- Do not begin implementation work on `main` unless the user explicitly asks for it.

## Commits

- Prefer atomic commits that capture one logical change.
- Use imperative commit messages such as `Add USDA search route`.
- Do not bundle refactors, UI tweaks, and backend behavior changes into one commit unless they are inseparable.

## Testing

- Add or update unit tests for any non-trivial business logic before merging.
- Run `pytest` from the repo root and `npm run check` plus `npm test` from [frontend/package.json](/home/brianminer/workspace/svelte/frontend/package.json) before opening a merge request.
- Treat failing tests as blockers for merge unless explicitly waived.

## Environment

- Activate `conda activate svelte` before installing Python or Node dependencies.
- Keep Python dependency declarations in [pyproject.toml](/home/brianminer/workspace/svelte/pyproject.toml).
- Document any new setup steps in [docs/PROJECT_SETUP.md](/home/brianminer/workspace/svelte/docs/PROJECT_SETUP.md).

## Review expectations

- Review for behavioral regressions, state-management issues, API error handling, and mobile responsiveness.
- Include screenshots or short notes for UI changes.
- Document new environment variables and external services in `README.md`.
- Preserve a clean separation between frontend UI code and backend business logic.

## Current repo note

- This workspace did not start as a git repository, so branch discipline begins once git is initialized locally.
