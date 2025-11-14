#!/usr/bin/env bash

# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Set locale to avoid side effects
export LC_ALL=C

# Exit on error, undefined variables, and pipe failures
set -euo pipefail

# Script to wipe Android storage for Cashtab app
# This clears all app data including wallets, settings, and cache

echo "⚠️  WARNING: This will completely wipe all Cashtab app data!"
echo "   This includes all wallets, settings, contacts, and cache."
echo "   This action cannot be undone."
echo ""

# Prompt for user confirmation
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled."
    exit 0
fi

echo ""
echo "Wiping Cashtab Android storage..."

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "Error: adb command not found. Please install Android SDK platform tools."
    exit 1
fi

# Check if any devices are connected
if ! adb devices | grep -q "device$"; then
    echo "Error: No Android devices or emulators found."
    echo "Please connect a device via USB with USB debugging enabled, or start an emulator."
    exit 1
fi

# Clear the app data
echo "Clearing app data for com.cashtab.app..."
if adb shell pm clear com.cashtab.app; then
    echo "✅ Successfully wiped Cashtab storage!"
    echo "The app will start fresh on next launch."
else
    echo "❌ Failed to wipe storage. Make sure the app is installed and accessible."
    exit 1
fi
