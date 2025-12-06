#!/usr/bin/env bash

export LC_ALL=C
set -euo pipefail

# Build Cashtab as a Chrome/Brave browser extension

# Create a working directory for stashing non-extension files
WORKDIR=$(mktemp -d)
echo Using workdir ${WORKDIR}

# Delete workdir on script finish
function cleanup {
    # Replace original web files
    echo 'Replacing original web files'
    rm public/manifest.json

    mv ${WORKDIR}/manifest.json public/

    echo 'Web files replaced'

    echo Deleting workdir ${WORKDIR}
    rm -rf "${WORKDIR}"
}
trap cleanup EXIT

# Stash web files that require extension changes in workdir
mv public/manifest.json ${WORKDIR}

# Move extension src files into place for npm build
cp extension/public/manifest.json public/

# Delete the last extension build
if [ -d "extension/dist/" ]; then rm -Rf extension/dist/; fi

# Build the extension
mkdir extension/dist/
echo 'Building Extension...'

# Required for extension build rules
export INLINE_RUNTIME_CHUNK=false
export GENERATE_SOURCEMAP=false

pnpm run build

# Copy extension build files to extension/ folder
cp -r build/* extension/dist

# Build TypeScript files
echo 'Building TypeScript files...'
pnpm run extension:tsc

# Delete extension build from build/ folder (reserved for web app builds)
rm -Rf build

echo 'Extension built!'
