#!/usr/bin/env bash
# Deploy the current commit of `main` to the Relish server over Tailscale.
#
#   RELISH_DEPLOY_TARGET=<user>@relish scripts/deploy.sh [--skip-tests]
#
# Steps: refuse uncommitted changes or a non-main branch -> run backend and frontend tests
# -> build the web app -> copy the code to the server -> keep the previous release ->
# install -> restart (the service snapshots the database on start) -> health check ->
# roll back to the previous release automatically if the health check fails.
#
# Rollback restores code only. Database migrations are forward-only; the startup snapshot
# in /var/lib/relish/backups is the way back from a bad migration.
set -euo pipefail

TARGET="${RELISH_DEPLOY_TARGET:-}"
SKIP_TESTS=0
for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

if [[ -z "$TARGET" ]]; then
  echo "Set RELISH_DEPLOY_TARGET, for example: RELISH_DEPLOY_TARGET=you@relish scripts/deploy.sh" >&2
  exit 2
fi
if [[ "${CONDA_DEFAULT_ENV:-}" != "svelte" ]]; then
  echo "Activate the conda environment first: conda activate svelte" >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "main" ]]; then
  echo "Deploy from main (currently on $BRANCH)." >&2
  exit 1
fi
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Commit or stash tracked changes before deploying." >&2
  exit 1
fi
COMMIT="$(git rev-parse --short HEAD)"
echo "==> Deploying $COMMIT to $TARGET"

if [[ "$SKIP_TESTS" -eq 0 ]]; then
  echo "==> Backend tests"
  pytest -q
  echo "==> Frontend type check and tests"
  (cd frontend && npm run check && npm test)
else
  echo "==> Skipping tests (--skip-tests)"
fi

echo "==> Building web app"
(cd frontend && rm -rf dist && npm run build:web)

echo "==> Copying release to the server"
rsync -az --delete \
  --exclude .git --exclude node_modules --exclude 'frontend/.expo' \
  --exclude '*.db' --exclude '*.db-*' --exclude tmp --exclude .env --exclude 'frontend/.env' \
  --exclude .pytest_cache --exclude .ruff_cache --exclude __pycache__ --exclude .codex \
  --exclude .claude --exclude '*.egg-info' --exclude backups \
  ./ "$TARGET:/tmp/relish-release/"

echo "==> Installing and restarting on the server"
ssh "$TARGET" "COMMIT=$COMMIT bash -s" <<'REMOTE'
set -euo pipefail
APP=/opt/relish/app
PREVIOUS=/opt/relish/app.previous
# pip runs as the relish user; start from a directory it can read (not the SSH user's home).
cd /opt/relish

install_app() {
  sudo -u relish /opt/relish/venv/bin/pip install --quiet --disable-pip-version-check -e "$APP" >/tmp/relish-pip.log 2>&1
}

health() {
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null http://127.0.0.1:8000/api/health; then
      return 0
    fi
    sleep 1
  done
  return 1
}

sudo rsync -a --delete "$APP/" "$PREVIOUS/"
sudo rsync -a --delete /tmp/relish-release/ "$APP/"
echo "$COMMIT" | sudo tee "$APP/DEPLOYED_COMMIT" >/dev/null
sudo chown -R relish:relish "$APP" "$PREVIOUS"
if install_app; then
  sudo systemctl restart relish.service
  if health; then
    echo "Healthy: $(curl -fsS http://127.0.0.1:8000/api/health)"
    exit 0
  fi
  echo "Health check failed; rolling back to the previous release." >&2
  sudo journalctl -u relish.service --no-pager -n 30 >&2 || true
else
  echo "Dependency install failed; rolling back to the previous release." >&2
  tail -20 /tmp/relish-pip.log >&2 || true
fi

sudo rsync -a --delete "$PREVIOUS/" "$APP/"
sudo chown -R relish:relish "$APP"
install_app || echo "Reinstalling the previous release's dependencies failed; see /tmp/relish-pip.log" >&2
sudo systemctl restart relish.service
if health; then
  echo "Rolled back to $(cat "$APP/DEPLOYED_COMMIT" 2>/dev/null || echo 'the previous release')." >&2
else
  echo "Rollback also failed health checks. Inspect: journalctl -u relish.service" >&2
fi
exit 1
REMOTE

echo "==> Deployed $COMMIT"
