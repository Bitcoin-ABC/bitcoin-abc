#!/usr/bin/env bash
export LC_ALL=C.UTF-8
set -euo pipefail

# Always run from the cashtab directory (where this script lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[start-ios] Building web assets..."
npm run build

echo "[start-ios] Launching the IOS app..."
npx cap run ios

echo "[start-ios] Done."
