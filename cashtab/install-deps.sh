#!/usr/bin/env bash

# Cashtab Dependency Installation Script
# This script builds and installs all local dependencies required for Cashtab

export LC_ALL=C.UTF-8
set -e  # Exit on any error

echo "🚀 Installing Cashtab dependencies..."

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📍 Repository root: $REPO_ROOT"

# Install all workspace dependencies
echo "📦 Installing workspace dependencies..."
pushd "$REPO_ROOT" > /dev/null
pnpm install --frozen-lockfile
popd > /dev/null

# Build ecash-lib-wasm (special case - uses Docker, not a pnpm package)
echo "📦 Building ecash-lib-wasm..."
pushd "$REPO_ROOT/modules/ecash-lib-wasm" > /dev/null
if [ -f "dockerbuild.sh" ]; then
    echo "  Running Docker build..."
    ./dockerbuild.sh
else
    echo "❌ Error: dockerbuild.sh not found in ecash-lib-wasm"
    echo "   This script is required to build the WASM module."
    exit 1
fi
popd > /dev/null
echo "✅ ecash-lib-wasm complete"

# Install and build mock-chronik-client (needed for tests)
echo "📦 Installing and building mock-chronik-client..."
pushd "$REPO_ROOT" > /dev/null
pnpm install --frozen-lockfile --filter mock-chronik-client...
pnpm --filter mock-chronik-client run build
popd > /dev/null
echo "✅ mock-chronik-client complete"

# Build cashtab and all its dependencies using pnpm workspace
echo "📦 Building Cashtab and all dependencies..."
pushd "$REPO_ROOT" > /dev/null
pnpm --filter cashtab... run build
popd > /dev/null

echo "✅ All dependencies installed and built successfully!"
echo "🎉 You can now run 'pnpm start' from the cashtab directory"
