#!/usr/bin/env bash
set -euo pipefail

if [[ "${CONDA_DEFAULT_ENV:-}" != "svelte" ]]; then
  echo "Activate the conda environment first: conda activate svelte" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  export DATABASE_URL="sqlite:///./nutrition_os.dev.db"
fi

LOG_DIR="${BACKEND_LOG_DIR:-tmp}"
LOG_FILE="${BACKEND_LOG_FILE:-$LOG_DIR/backend.log}"

mkdir -p "$LOG_DIR"
: > "$LOG_FILE"
echo "Writing backend logs to $LOG_FILE" >&2

uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000 2>&1 | tee -a "$LOG_FILE"
