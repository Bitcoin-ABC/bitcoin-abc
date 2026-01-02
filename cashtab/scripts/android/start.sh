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

echo "[start] Building web app..."
cd "${APP_DIR}"
pnpm run build

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
