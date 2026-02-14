#!/usr/bin/env bash
set -euo pipefail
set +x

OWNER="${OWNER:-Toru-Takagi}"
REPO="${REPO:-togello-mcp-server}"
TARGET_DIR="${TARGET_DIR:-worktrees/${REPO}}"

export OWNER
export REPO

if ! command -v npm >/dev/null 2>&1; then
  echo "[setup] npm が見つかりません" >&2
  exit 1
fi

npm install

token_file="$(mktemp -t gh_install_token.XXXXXX)"
cleanup() {
  rm -f "${token_file}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

CODEX_INSTALL_TOKEN_FILE="${token_file}" npm run codex:preclone

INSTALL_TOKEN="$(cat "${token_file}")"
if [[ -z "${INSTALL_TOKEN}" ]]; then
  echo "[setup] Failed to read installation token" >&2
  exit 1
fi

CLONE_URL="https://x-access-token:${INSTALL_TOKEN}@github.com/${OWNER}/${REPO}.git"
PUBLIC_URL="https://github.com/${OWNER}/${REPO}.git"

if [[ -d "${TARGET_DIR}/.git" ]]; then
  git -C "${TARGET_DIR}" remote set-url origin "${CLONE_URL}"
  git -C "${TARGET_DIR}" fetch --prune
else
  git clone "${CLONE_URL}" "${TARGET_DIR}"
fi

git -C "${TARGET_DIR}" remote set-url origin "${PUBLIC_URL}"
