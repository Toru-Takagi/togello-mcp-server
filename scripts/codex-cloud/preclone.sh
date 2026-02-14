#!/usr/bin/env bash
set -euo pipefail
set +x

OWNER="${OWNER:-Toru-Takagi}"
REPO="${REPO:-togello-mcp-server}"

: "${GITHUB_APP_ID:?GITHUB_APP_ID is required}"
: "${GITHUB_INSTALLATION_ID:?GITHUB_INSTALLATION_ID is required}"
: "${GITHUB_APP_PRIVATE_KEY_B64:?GITHUB_APP_PRIVATE_KEY_B64 is required}"

if ! command -v curl >/dev/null 2>&1; then
  echo "[setup] curl が見つかりません" >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "[setup] openssl が見つかりません" >&2
  exit 1
fi

if ! command -v base64 >/dev/null 2>&1; then
  echo "[setup] base64 が見つかりません" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y >/dev/null
    apt-get install -y jq >/dev/null
  else
    echo "[setup] jq が見つからず、apt-get も見つかりません" >&2
    exit 1
  fi
fi

pem_path="$(mktemp -t github_app.XXXXXX.pem)"
cleanup() {
  rm -f "${pem_path}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

base64_decode() {
  if printf '' | base64 -d >/dev/null 2>&1; then
    base64 -d
    return 0
  fi
  if printf '' | base64 -D >/dev/null 2>&1; then
    base64 -D
    return 0
  fi
  if printf '' | base64 --decode >/dev/null 2>&1; then
    base64 --decode
    return 0
  fi
  return 1
}

if ! printf '%s' "${GITHUB_APP_PRIVATE_KEY_B64}" | base64_decode > "${pem_path}" 2>/dev/null; then
  echo "[setup] base64 decode に失敗しました" >&2
  exit 1
fi
chmod 600 "${pem_path}"

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

HEADER="$(printf '{"alg":"RS256","typ":"JWT"}' | b64url)"
NOW="$(date +%s)"
PAYLOAD="$(printf '{"iat":%d,"exp":%d,"iss":"%s"}' "$((NOW-60))" "$((NOW+600))" "$GITHUB_APP_ID" | b64url)"
SIGNATURE="$(printf '%s.%s' "$HEADER" "$PAYLOAD" | openssl dgst -sha256 -sign "${pem_path}" | b64url)"
JWT="${HEADER}.${PAYLOAD}.${SIGNATURE}"

echo "[setup] Checking GitHub App access to ${OWNER}/${REPO}"

INSTALL_TOKEN="$(curl -fsS -X POST -H "Authorization: Bearer ${JWT}" -H "Accept: application/vnd.github+json" "https://api.github.com/app/installations/${GITHUB_INSTALLATION_ID}/access_tokens" | jq -r '.token // empty')"
if [[ -z "${INSTALL_TOKEN}" || "${INSTALL_TOKEN}" == "null" ]]; then
  echo "[setup] Failed to get installation token" >&2
  exit 1
fi

API_RESULT="$(curl -fsS -H "Authorization: token ${INSTALL_TOKEN}" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/${OWNER}/${REPO}" | jq -r '.full_name // .message // empty')"
if [[ "${API_RESULT}" != "${OWNER}/${REPO}" ]]; then
  echo "[setup] Repo API check failed: ${API_RESULT:-unknown}" >&2
  exit 1
fi

echo "[setup] ✅ Repo API check OK: ${API_RESULT}"

if [[ -n "${CODEX_INSTALL_TOKEN_FILE:-}" ]]; then
  umask 077
  printf '%s' "${INSTALL_TOKEN}" > "${CODEX_INSTALL_TOKEN_FILE}"
fi
