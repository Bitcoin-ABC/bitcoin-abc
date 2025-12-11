#!/usr/bin/env bash

# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Build script for creating Android release APK/AAB for Play Store
export LC_ALL=C.UTF-8
set -euo pipefail

# Always run from the cashtab directory (where this script lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pushd "$SCRIPT_DIR"

# Load environment variables from .env.android if it exists
if [ -f ".env.android" ]; then
    echo "[buildAndroidRelease] Loading environment variables from .env.android..."
    # Temporarily disable -u to allow unbound variables (like $npm_package_version)
    set +u
    set -a
    source .env.android
    set +a
    set -u
else
    echo "WARNING: .env.android not found. Using default .env file."
fi

# Check if keystore properties are set
if [ ! -f "android/keystore.properties" ]; then
    echo "ERROR: android/keystore.properties not found!"
    echo ""
    echo "Please create android/keystore.properties with the following properties:"
    echo "  RELEASE_STORE_FILE=path/to/your/keystore.jks"
    echo "  RELEASE_STORE_PASSWORD=your_store_password"
    echo "  RELEASE_KEY_ALIAS=your_key_alias"
    echo "  RELEASE_KEY_PASSWORD=your_key_password"
    echo ""
    echo "See README-ANDROID-RELEASE.md for instructions on creating a keystore."
    exit 1
fi

echo "[buildAndroidRelease] Building web assets..."
pnpm run build

echo "[buildAndroidRelease] Syncing Capacitor Android platform..."
npx cap sync android

echo "[buildAndroidRelease] Checking version..."
cd android
./gradlew :app:printVersion

echo "[buildAndroidRelease] Cleaning previous builds..."
./gradlew clean

echo "[buildAndroidRelease] Building release APK..."

# Build release APK
./gradlew assembleRelease

echo ""
echo "[buildAndroidRelease] Release APK built successfully!"
echo "APK location: android/app/build/outputs/apk/release/app-release.apk"
echo ""

echo "[buildAndroidRelease] Building release AAB..."
./gradlew bundleRelease
echo ""
echo "[buildAndroidRelease] Release AAB built successfully!"
echo "AAB location: android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "For Play Store, upload the AAB file (app-release.aab) instead of the APK."

popd

echo "[buildAndroidRelease] Done."

