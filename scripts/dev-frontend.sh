#!/usr/bin/env bash
set -euo pipefail

if [[ "${CONDA_DEFAULT_ENV:-}" != "svelte" ]]; then
  echo "Activate the conda environment first: conda activate svelte" >&2
  exit 1
fi

cd frontend
npm start
