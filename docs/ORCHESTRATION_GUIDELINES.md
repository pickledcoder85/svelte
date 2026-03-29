# Worker Orchestration Guidelines

This document defines the required workflow when using multiple workers on this repository.

## Goals

- Keep `main` clean and releasable.
- Keep worker write scopes disjoint.
- Preserve atomic commits and short-lived feature branches.
- Avoid mixed frontend/backend/database diffs in the same worktree.

## Dispatch rules

1. The orchestrator creates or verifies the worker branch from `main` before code-writing starts.
2. The orchestrator records the worker worktree path, assigned scope, expected tests, and base commit before code-writing starts.
3. Parallel code-writing is only allowed when each worker has a separate verified worktree and a disjoint write scope.
4. If separate worktrees cannot be verified, only one worker may write code at a time.
5. Additional workers may still do read-only analysis, test review, or design work.
6. The immediate blocking task stays with the orchestrator. Do not delegate the next critical-path step if the main flow must wait for it.

## Ownership rules

- Database worker owns schema, migrations, seed data, and persistence-only files.
- Backend worker owns `backend/` and backend tests only.
- Frontend worker owns `frontend/` and frontend tests only.
- Cross-layer edits belong to the orchestrator unless the slice is explicitly single-owner.

## Boundary rules

Each worker must stop only at a commit-ready boundary and report:

- branch name
- worktree path
- base commit
- intended commit message
- tests run
- files changed
- blockers or known risks

The orchestrator must verify the branch and changed files before allowing more work.

Commit-ready means:

- the slice is bounded to its assigned scope
- the diff is coherent and does not rely on follow-up edits in the same scope
- required tests for the slice have been run or explicitly reported as blocked
- the worker is ready either for integration or for a single clear round of review feedback

## Polling and visibility rules

- While any worker is active, the orchestrator must poll worker status on a regular cadence.
- Default cadence for this repository is every 2 minutes unless a shorter blocking step is in progress.
- Poll again immediately after a worker finishes, reports a blocker, or completes a long-running validation step.
- Poll results must be surfaced to the user as a consolidated update covering:
  - active workers
  - completed workers
  - verification state
  - commit-ready boundaries
  - blockers
- If no worker is active, the orchestrator must say that explicitly rather than implying work is still in flight.
- Polling is part of orchestration, not an optional courtesy.

## Verification rules

After each dispatch, the orchestrator must verify:

1. active branch name
2. worker worktree path
3. base commit matches `main`
4. changed files match the assigned scope
5. no unrelated files were modified
6. the worker did not write on `main`

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
5. Delete the completed worker worktree.
6. Delete temporary recovery branches and worktrees immediately.

## Orchestrator control loop

The orchestrator must follow this sequence until the implementation plan is complete:

1. Dispatch the next bounded slices from clean `main`.
2. Verify actual branch and worktree state immediately after dispatch.
3. Poll every 2 minutes while any worker is active.
4. Surface consolidated worker status updates to the user.
5. When a worker reaches a commit-ready boundary, stop further dispatch in that area.
6. Integrate the slice into the orchestrator's active branch or merge path.
7. Validate the slice locally.
8. Commit the slice atomically.
9. Merge the feature branch into `main`.
10. Delete the completed feature branch or temporary worktree.
11. Dispatch the next bounded slice automatically without waiting for user instruction.

If this loop is broken, treat it as a workflow bug and correct it before continuing implementation.

## Default safe mode

When there is any doubt about branch or worktree isolation:

- use a single active code-writing branch
- keep other workers read-only
- resume parallel code-writing only after isolation is proven
- if isolation cannot be proven quickly, stop delegating code edits and continue locally
