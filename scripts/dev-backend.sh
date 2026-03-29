#!/usr/bin/env bash
set -euo pipefail

if [[ "${CONDA_DEFAULT_ENV:-}" != "svelte" ]]; then
  echo "Activate the conda environment first: conda activate svelte" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  export DATABASE_URL="sqlite:///./nutrition_os.dev.db"
fi

uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
