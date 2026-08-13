#!/usr/bin/env bash
# One-time provisioner for EPRIS Interview Studio.
# Downloads the speech model once to the VPS. Editorial recordings never leave
# the server; this script communicates only with the package/model registries.
set -euo pipefail

ROOT="${INTERVIEW_DIR:-/opt/epris-interviews}"
VENV="$ROOT/.venv"
MODEL_DIR="$ROOT/models/small.en"
PYTHON_BIN="${PYTHON_BIN:-python3}"
WORKER_SOURCE="${1:-$ROOT/transcribe-local.py}"

test -f "$WORKER_SOURCE" || { echo "Worker script not found: $WORKER_SOURCE" >&2; exit 1; }
mkdir -p "$ROOT/models"
"$PYTHON_BIN" -m venv "$VENV"
"$VENV/bin/pip" install --disable-pip-version-check --no-cache-dir --upgrade pip
"$VENV/bin/pip" install --disable-pip-version-check --no-cache-dir "faster-whisper>=1.1,<2"

MODEL_DIR="$MODEL_DIR" "$VENV/bin/python" - <<'PY'
import os
from huggingface_hub import snapshot_download

snapshot_download(
    repo_id="Systran/faster-whisper-small.en",
    local_dir=os.environ["MODEL_DIR"],
    local_dir_use_symlinks=False,
)
PY

INTERVIEW_WHISPER_MODEL="$MODEL_DIR" "$VENV/bin/python" "$WORKER_SOURCE" --health
echo "Local EPRIS transcription worker is ready."
