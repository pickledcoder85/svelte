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

## Documentation and release hygiene

- Any slice that changes user-visible behavior, target-generation logic, schema assumptions, or workflow guidance must update the relevant docs in the same branch.
- Keep [CHANGELOG.md](/home/brianminer/workspace/svelte/CHANGELOG.md) current as part of implementation, not as a later cleanup step.
- Keep roadmap and strategy docs in sync when feature direction changes materially, especially [docs/ARCHITECTURE_ROADMAP.md](/home/brianminer/workspace/svelte/docs/ARCHITECTURE_ROADMAP.md) and [docs/CALCULATION_STRATEGY.md](/home/brianminer/workspace/svelte/docs/CALCULATION_STRATEGY.md).
- When a feature introduces follow-up work or deferred scope, record it in a repo doc instead of leaving it only in chat.
- If a stable milestone has effectively moved, update the planned-tagging notes instead of leaving stale future-version claims behind.

## Worker orchestration

- Default to one code-writing worker at a time. Only use parallel code-writing when the orchestrator has explicitly verified separate worktrees and disjoint write scopes for each worker.
- If separate worktrees are not verified, workers may only do analysis, planning, review, or other read-only tasks.
- One worker owns one layer and one write scope at a time.
- Backend worker scope is `backend/` plus backend tests.
- Frontend worker scope is `frontend/` plus frontend tests.
- Database worker scope is migrations, seed data, repository persistence helpers, and database-focused tests.
- Cross-layer edits stay with the orchestrator unless the slice is explicitly defined as single-owner and still commit-ready.
- Before dispatching any code-writing worker, the orchestrator must verify:
  - current branch and cleanliness of the source worktree
  - worker branch name
  - worker worktree path
  - worker base commit is `main`
  - assigned file scope
  - expected tests for the slice
- After dispatching a worker, the orchestrator must immediately verify the actual branch and diff in that worker worktree before treating the worker as active.
- If a worker writes outside its assigned scope, writes on `main`, or mixes unrelated changes into the slice, stop that slice immediately and repair git state before dispatching more work.
- Workers must stop only at commit-ready boundaries and report:
  - branch name
  - worktree path
  - base commit
  - intended commit message
  - tests run
  - files changed
  - blockers or known risks
- "Commit-ready" means the slice is bounded, the owned files are consistent, required tests for that slice have been run or explicitly reported as blocked, and the worker is not leaving partial follow-up edits in the same scope.
- While any worker is active, poll worker status every 2 minutes and also after any long-running or blocking step that could change status materially.
- Poll updates to the user must be consolidated and must include:
  - active workers
  - completed workers
  - current verification state
  - blockers
- If no worker is active, say that explicitly instead of implying ongoing background work.
- Do not claim work is happening "in the background" unless a worker is actually active and has been verified.
- The orchestrator must keep the immediate blocking task local. Do not delegate the very next step if progress depends on its result.
- Follow the orchestrator control loop strictly: dispatch, verify, poll, integrate, validate, commit, merge, delete branch, and automatically dispatch the next slice.
- Treat any break in that control loop as a workflow bug that must be corrected before more implementation continues.
- Merge or discard a completed worker slice before dispatching another slice in the same area.
- Delete intermediate worker and recovery branches immediately after merge.

## Current repo note

- This workspace did not start as a git repository, so branch discipline begins once git is initialized locally.
