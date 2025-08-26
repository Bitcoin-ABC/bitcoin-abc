#!/usr/bin/env bash

# Cashtab Dependency Installation Script
# This script builds and installs all local dependencies required for Cashtab

export LC_ALL=C.UTF-8
set -e  # Exit on any error

echo "🚀 Installing Cashtab dependencies..."

# Function to build a module
build_module() {
    local module_path=$1
    local module_name=$2

    echo "📦 Building $module_name..."
    cd "$module_path"

    if [ -f "package.json" ]; then
        echo "  Installing dependencies..."
        npm ci

        if [ -f "package.json" ] && grep -q '"build"' package.json; then
            echo "  Building module..."
            npm run build
        fi
    fi

    cd - > /dev/null
    echo "✅ $module_name complete"
}

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📍 Repository root: $REPO_ROOT"

# Build all modules
build_module "$REPO_ROOT/modules/b58-ts" "b58-ts"
build_module "$REPO_ROOT/modules/ecashaddrjs" "ecashaddrjs"

# Build ecash-lib-wasm (special case - uses Docker)
echo "📦 Building ecash-lib-wasm..."
cd "$REPO_ROOT/modules/ecash-lib-wasm"
if [ -f "dockerbuild.sh" ]; then
    echo "  Running Docker build..."
    ./dockerbuild.sh
else
    echo "❌ Error: dockerbuild.sh not found in ecash-lib-wasm"
    echo "   This script is required to build the WASM module."
    exit 1
fi
cd - > /dev/null
echo "✅ ecash-lib-wasm complete"

build_module "$REPO_ROOT/modules/chronik-client" "chronik-client"
build_module "$REPO_ROOT/modules/ecash-lib" "ecash-lib"
build_module "$REPO_ROOT/modules/ecash-agora" "ecash-agora"
build_module "$REPO_ROOT/modules/mock-chronik-client" "mock-chronik-client"

# Install Cashtab dependencies
echo "📦 Installing Cashtab dependencies..."
cd "$SCRIPT_DIR"
npm ci

echo "✅ All dependencies installed successfully!"
echo "🎉 You can now run 'npm start' from the cashtab directory"
