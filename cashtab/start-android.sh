#!/usr/bin/env bash
export LC_ALL=C.UTF-8
set -euo pipefail

# Always run from the cashtab directory (where this script lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[startAndroid] Building web assets..."
pnpm run build

echo "[startAndroid] Syncing Capacitor Android platform..."
npx cap sync android

echo "[startAndroid] Installing debug APK via Gradle..."
cd android
./gradlew installDebug

echo "[startAndroid] Launching app activity..."
adb shell am start -n com.cashtab.app/.MainActivity

echo "[startAndroid] Done."


