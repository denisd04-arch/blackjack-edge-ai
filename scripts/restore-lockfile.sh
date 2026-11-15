#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCK="$ROOT/package-lock.json"
ARTIFACT="$ROOT/scripts/package-lock.json.gz.b64"
if [[ -f "$LOCK" ]] && [[ $(wc -c <"$LOCK") -gt 10000 ]]; then
  exit 0
fi
if compgen -G "$ROOT/scripts/lock.split.*" > /dev/null; then
  cat "$ROOT"/scripts/lock.split.* | base64 -d | gunzip > "$LOCK"
elif compgen -G "$ROOT/scripts/lock.part.*" > /dev/null; then
  cat "$ROOT"/scripts/lock.part.* | base64 -d | gunzip > "$LOCK"
elif [[ -f "$ARTIFACT" ]]; then
  base64 -d "$ARTIFACT" | gunzip > "$LOCK"
else
  echo "missing lock artifact" >&2
  exit 1
fi
echo "Restored $LOCK from artifact"