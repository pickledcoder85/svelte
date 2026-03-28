# Worker Orchestration Guidelines

This document defines the required workflow when using multiple workers on this repository.

## Goals

- Keep `main` clean and releasable.
- Keep worker write scopes disjoint.
- Preserve atomic commits and short-lived feature branches.
- Avoid mixed frontend/backend/database diffs in the same worktree.

## Dispatch rules

1. The orchestrator creates or verifies the worker branch from `main` before code-writing starts.
2. Parallel code-writing is only allowed when each worker has a separate verified worktree.
3. If separate worktrees cannot be verified, only one worker may write code at a time.
4. Additional workers may still do read-only analysis, test review, or design work.

## Ownership rules

- Database worker owns schema, migrations, seed data, and persistence-only files.
- Backend worker owns `backend/` and backend tests only.
- Frontend worker owns `frontend/` and frontend tests only.
- Cross-layer edits belong to the orchestrator unless the slice is explicitly single-owner.

## Boundary rules

Each worker must stop only at a commit-ready boundary and report:

- branch name
- intended commit message
- tests run
- files changed

The orchestrator must verify the branch and changed files before allowing more work.

## Polling and visibility rules

- While any worker is active, the orchestrator must poll worker status on a regular cadence.
- Default cadence for this repository is every 2 minutes unless a shorter blocking step is in progress.
- Poll results must be surfaced to the user as a consolidated update covering:
  - active workers
  - completed workers
  - commit-ready boundaries
  - blockers
- If no worker is active, the orchestrator must say that explicitly rather than implying work is still in flight.
- Polling is part of orchestration, not an optional courtesy.

## Verification rules

After each dispatch, the orchestrator must verify:

1. active branch name
2. changed files match the assigned scope
3. no unrelated files were modified
4. the worker did not write on `main`

If any verification fails:

1. stop new dispatches
2. isolate or discard the mixed changes
3. restore branch hygiene
4. only then resume implementation

## Merge rules

1. Run required tests for the slice.
2. Commit atomically.
3. Merge into `main`.
4. Delete the completed feature branch.
5. Delete temporary recovery branches and worktrees immediately.

## Orchestrator control loop

The orchestrator must follow this sequence until the implementation plan is complete:

1. Dispatch the next bounded slices from clean `main`.
2. Verify actual branch and worktree state immediately after dispatch.
3. Poll every 2 minutes while any worker is active.
4. Surface consolidated worker status updates to the user.
5. When a worker reaches a commit-ready boundary, stop further dispatch in that area.
6. Validate the slice locally.
7. Commit the slice atomically.
8. Merge the feature branch into `main`.
9. Delete the completed feature branch or temporary worktree.
10. Dispatch the next bounded slice automatically without waiting for user instruction.

If this loop is broken, treat it as a workflow bug and correct it before continuing implementation.

## Default safe mode

When there is any doubt about branch or worktree isolation:

- use a single active code-writing branch
- keep other workers read-only
- resume parallel code-writing only after isolation is proven
