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

echo "[start] Building web app with Android environment..."
cd "${APP_DIR}"

# Backup original .env and use .env.android for build
if [ -f "${APP_DIR}/.env.android" ]; then
    echo "[start] Found .env.android file"
    RECAPTCHA_KEY=$(grep "^VITE_RECAPTCHA_SITE_KEY=" "${APP_DIR}/.env.android" | cut -d'=' -f2- | tr -d ' ')
    if [ -n "${RECAPTCHA_KEY}" ]; then
        echo "[start] reCAPTCHA site key from .env.android: ${RECAPTCHA_KEY}"
    else
        echo "[start] WARNING: VITE_RECAPTCHA_SITE_KEY not found in .env.android"
    fi

    # Backup .env if it exists
    if [ -f "${APP_DIR}/.env" ]; then
        cp "${APP_DIR}/.env" "${APP_DIR}/.env.backup"
        echo "[start] Backed up .env to .env.backup"
    fi

    # Copy .env.android to .env so Vite loads it
    cp "${APP_DIR}/.env.android" "${APP_DIR}/.env"
    echo "[start] Copied .env.android to .env for build"
else
    echo "[start] WARNING: .env.android not found, will use default .env"
fi

# Build (no need for --mode since we're using .env directly)
pnpm run build

# Restore original .env if backup exists
if [ -f "${APP_DIR}/.env.backup" ]; then
    mv "${APP_DIR}/.env.backup" "${APP_DIR}/.env"
    echo "[start] Restored original .env"
fi

echo "[start] Syncing Capacitor (android)..."
npx cap sync android

# Get the first connected Android device
DEVICE=$(adb devices | grep 'device$' | head -n1 | awk '{print $1}')

if [ -z "$DEVICE" ]; then
    echo "No Android devices found. Please connect a device or start an emulator."
    exit 1
fi

echo "[start] Building and installing dev flavor on device: ${DEVICE}"
echo "[start] Note: If installation fails with 'EOF' or 'InstallException', this is usually an ADB communication issue - try unplugging/reconnecting the device"
cd "${ANDROID_DIR}"
./gradlew installDevDebug

echo "[start] Launching app..."
adb -s "${DEVICE}" shell am start -n com.cashtab.app.dev/com.cashtab.app.MainActivity
