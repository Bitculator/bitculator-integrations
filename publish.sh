#!/usr/bin/env bash
#
# Publish a clean SNAPSHOT of integrations/ to its public mirror repo
# (github.com/Bitculator/bitculator-integrations) — the target of the
# "Spreadsheets" section's guide links on /crypto-api.
#
# Same privacy model as sdks/release.sh: the mirror receives ONE fresh
# "Publish guides" commit authored as the org identity — your personal git
# name/email and the monorepo's history are never published.
#
#   ./integrations/publish.sh
#   REMOTE_BASE=https://github.com/bitculator ./integrations/publish.sh
#
# Prereqs: the public repo exists under the GitHub org, your git can push to
# it, and integrations/ is fully committed (snapshots are taken from HEAD).

set -euo pipefail

REMOTE_BASE="${REMOTE_BASE:-git@github.com:bitculator}"
REPO="bitculator-integrations"

RELEASE_AUTHOR_NAME="${RELEASE_AUTHOR_NAME:-Bitculator}"
RELEASE_AUTHOR_EMAIL="${RELEASE_AUTHOR_EMAIL:-contact@bitculator.com}"

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

if [ -n "$(git status --porcelain integrations/)" ]; then
  echo "✗ integrations/ has uncommitted changes — commit them first (snapshots are taken from HEAD)." >&2
  exit 1
fi

export GIT_AUTHOR_NAME="$RELEASE_AUTHOR_NAME"
export GIT_AUTHOR_EMAIL="$RELEASE_AUTHOR_EMAIL"
export GIT_COMMITTER_NAME="$RELEASE_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$RELEASE_AUTHOR_EMAIL"

url="${REMOTE_BASE}/${REPO}.git"
echo "── integrations → ${url}"

tree="$(git rev-parse "HEAD:integrations")"

parent_args=()
if git fetch "$url" main 2>/dev/null; then
  parent_args=(-p FETCH_HEAD)
fi

commit="$(git commit-tree "$tree" "${parent_args[@]}" -m "Publish guides")"
git push "$url" "${commit}:refs/heads/main"
echo "   ✓ pushed main (author: ${RELEASE_AUTHOR_NAME} <${RELEASE_AUTHOR_EMAIL}>)"
