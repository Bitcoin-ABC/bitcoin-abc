#!/usr/bin/env bash

# Copyright (c) 2026 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8
set -euo pipefail

# Resolve paths
SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ANDROID_DIR="${APP_DIR}/android"

echo "[build-debug] App dir: ${APP_DIR}"

# Optional environment diagnostics
echo "[build-debug] Node: $(node -v)"
if command -v pnpm >/dev/null 2>&1; then
  echo "[build-debug] pnpm: $(pnpm -v)"
elif command -v npm >/dev/null 2>&1; then
  echo "[build-debug] npm: $(npm -v)"
fi
if command -v java >/dev/null 2>&1; then
  echo "[build-debug] Java: $(java -version 2>&1 | head -n1)"
fi

# Install deps and build web assets
cd "${APP_DIR}"
if command -v pnpm >/dev/null 2>&1; then
  echo "[build-debug] Installing dependencies (pnpm install --frozen-lockfile)"
  pnpm install --frozen-lockfile
  echo "[build-debug] Building web app"
  pnpm run build
else
  echo "[build-debug] Installing dependencies (npm ci)"
  npm ci
  echo "[build-debug] Building web app"
  npm run build
fi

# Sync Capacitor Android project
echo "[build-debug] Syncing Capacitor (android)"
npx cap sync android

# Assemble debug APK (dev flavor)
echo "[build-debug] Assembling dev debug APK"
cd "${ANDROID_DIR}"
./gradlew assembleDevDebug

APK_PATH="${ANDROID_DIR}/app/build/outputs/apk/dev/debug/app-dev-debug.apk"

if [ -f "${APK_PATH}" ]; then
  echo "[build-debug] Success: ${APK_PATH}"
else
  echo "[build-debug] ERROR: APK not found at expected path: ${APK_PATH}" >&2
  exit 1
fi
