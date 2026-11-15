#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARTIFACT="$ROOT/scripts/package-lock.json.gz.b64"
LOCK="$ROOT/package-lock.json"
if [[ -f "$LOCK" ]] && [[ $(wc -c <"$LOCK") -gt 10000 ]]; then
  exit 0
fi
if [[ ! -f "$ARTIFACT" ]]; then
  echo "missing $ARTIFACT" >&2
  exit 1
fi
base64 -d "$ARTIFACT" | gunzip > "$LOCK"
echo "Restored $LOCK from artifact"
