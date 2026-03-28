# AGENTS.md

This repository is expected to be developed with disciplined software engineering practices.

## Branching

- Start each feature or fix from a fresh branch named `feature/<scope>` or `fix/<scope>`.
- Keep `main` releasable.
- Rebase or merge from `main` frequently to avoid long-lived divergence.
- Do not begin implementation work on `main` unless the user explicitly asks for it.
- Every worker branch must start from `main`, never from another feature branch.
- The orchestrator must verify the actual active branch and diff after dispatching worker tasks.

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

## Worker orchestration

- Parallel code-writing is only allowed when each worker has a separate verified branch and worktree.
- If separate worktrees are not verified, workers may only do analysis, planning, or review, not code edits.
- One worker owns one layer and one write scope at a time.
- If a worker writes outside its assigned scope, stop the slice and repair git state before dispatching more work.
- Workers must stop only at commit-ready boundaries and report:
  - branch name
  - intended commit message
  - tests run
  - files changed
- While any worker is active, poll worker status every 2 minutes and report consolidated status updates to the user.
- If no worker is active, say that explicitly instead of implying ongoing background work.
- Follow the orchestrator control loop strictly: dispatch, verify, poll, integrate, validate, commit, merge, delete branch, and automatically dispatch the next slice.
- Treat any break in that control loop as a workflow bug that must be corrected before more implementation continues.
- Merge or discard a completed worker slice before dispatching another slice in the same area.
- Delete intermediate worker and recovery branches immediately after merge.

## Current repo note

- This workspace did not start as a git repository, so branch discipline begins once git is initialized locally.
