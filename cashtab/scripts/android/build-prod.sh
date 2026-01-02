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

echo "[build-prod] App dir: ${APP_DIR}"

# Check if .env.android exists (Node.js build process will load it)
if [ ! -f "${APP_DIR}/.env.android" ]; then
    echo "[build-prod] WARNING: .env.android not found. Using default .env file."
fi

# Check if keystore properties are set
if [ ! -f "${ANDROID_DIR}/keystore.properties" ]; then
    echo "[build-prod] ERROR: android/keystore.properties not found!" >&2
    echo "" >&2
    echo "Please create android/keystore.properties with the following properties:" >&2
    echo "  RELEASE_STORE_FILE=path/to/your/keystore.jks" >&2
    echo "  RELEASE_STORE_PASSWORD=your_store_password" >&2
    echo "  RELEASE_KEY_ALIAS=your_key_alias" >&2
    echo "  RELEASE_KEY_PASSWORD=your_key_password" >&2
    echo "" >&2
    echo "See README-ANDROID-RELEASE.md for instructions on creating a keystore." >&2
    exit 1
fi

# Check if the keystore file itself exists
# Read the keystore path from properties file
KEYSTORE_PATH=$(grep "^RELEASE_STORE_FILE=" "${ANDROID_DIR}/keystore.properties" | cut -d'=' -f2- | tr -d ' ')
if [ -n "${KEYSTORE_PATH}" ]; then
    # Resolve path relative to android directory if not absolute
    if [[ "${KEYSTORE_PATH}" != /* ]]; then
        KEYSTORE_FILE="${ANDROID_DIR}/${KEYSTORE_PATH}"
    else
        KEYSTORE_FILE="${KEYSTORE_PATH}"
    fi

    if [ ! -f "${KEYSTORE_FILE}" ]; then
        echo "[build-prod] ERROR: Keystore file not found: ${KEYSTORE_FILE}" >&2
        echo "[build-prod] The path in keystore.properties points to a file that doesn't exist." >&2
        echo "[build-prod] Please check RELEASE_STORE_FILE in android/keystore.properties" >&2
        exit 1
    fi
fi

# Optional environment diagnostics
echo "[build-prod] Node: $(node -v)"
if command -v pnpm >/dev/null 2>&1; then
  echo "[build-prod] pnpm: $(pnpm -v)"
elif command -v npm >/dev/null 2>&1; then
  echo "[build-prod] npm: $(npm -v)"
fi
if command -v java >/dev/null 2>&1; then
  echo "[build-prod] Java: $(java -version 2>&1 | head -n1)"
fi

# Install deps and build web assets
cd "${APP_DIR}"
if command -v pnpm >/dev/null 2>&1; then
  echo "[build-prod] Installing dependencies (pnpm install --frozen-lockfile)"
  pnpm install --frozen-lockfile
  echo "[build-prod] Building web app"
  pnpm run build
else
  echo "[build-prod] Installing dependencies (npm ci)"
  npm ci
  echo "[build-prod] Building web app"
  npm run build
fi

# Sync Capacitor Android project
echo "[build-prod] Syncing Capacitor (android)"
npx cap sync android

# Check version and clean previous builds
echo "[build-prod] Checking version..."
cd "${ANDROID_DIR}"
./gradlew :app:printVersion

echo "[build-prod] Cleaning previous builds..."
./gradlew clean

# Assemble production release APK and AAB
echo "[build-prod] Assembling production release APK"
./gradlew assembleProdRelease

echo "[build-prod] Building production release AAB (Android App Bundle)"
./gradlew bundleProdRelease

APK_PATH="${ANDROID_DIR}/app/build/outputs/apk/prod/release/app-prod-release.apk"
AAB_PATH="${ANDROID_DIR}/app/build/outputs/bundle/prodRelease/app-prod-release.aab"

SUCCESS=true

if [ -f "${APK_PATH}" ]; then
  echo "[build-prod] ✓ APK: ${APK_PATH}"
else
  echo "[build-prod] ✗ ERROR: APK not found at expected path: ${APK_PATH}" >&2
  echo "[build-prod]   This usually means the keystore file is missing or misconfigured." >&2
  echo "[build-prod]   Please check:" >&2
  echo "[build-prod]   1. The keystore file exists at the path specified in keystore.properties" >&2
  echo "[build-prod]   2. The RELEASE_STORE_FILE path in keystore.properties is correct" >&2
  SUCCESS=false
fi

if [ -f "${AAB_PATH}" ]; then
  echo "[build-prod] ✓ AAB: ${AAB_PATH}"
else
  echo "[build-prod] ✗ ERROR: AAB not found at expected path: ${AAB_PATH}" >&2
  SUCCESS=false
fi

if [ "${SUCCESS}" = true ]; then
  echo "[build-prod] Success! Both APK and AAB are ready for distribution"
  echo "[build-prod] - APK: ${APK_PATH}"
  echo "[build-prod] - AAB: ${AAB_PATH}"
  echo "[build-prod] For Play Store, upload the AAB file (recommended)"
else
  echo "[build-prod] Build completed with errors" >&2
  exit 1
fi
