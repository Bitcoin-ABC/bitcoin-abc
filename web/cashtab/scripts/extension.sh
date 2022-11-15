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
    rm src/assets/popout.svg
    rm public/manifest.json
    rm src/components/App.js
    rm src/components/App.css

    # Note, src/assets/popout.svg does not need to be replaced, not used by web app
    mv ${WORKDIR}/manifest.json public/
    mv ${WORKDIR}/App.js src/components/
    mv ${WORKDIR}/App.css src/components/

    echo 'Web files replaced'

    echo Deleting workdir ${WORKDIR}
    rm -rf "${WORKDIR}"
}
trap cleanup EXIT

# Stash web files that require extension changes in workdir
mv public/manifest.json ${WORKDIR}
mv src/components/App.js ${WORKDIR}
mv src/components/App.css ${WORKDIR}

# Move extension src files into place for npm build
cp extension/src/assets/popout.svg src/assets/
cp extension/public/manifest.json public/
cp extension/src/components/App.js src/components/
cp extension/src/components/App.css src/components/

# Delete the last extension build
if [ -d "extension/dist/" ]; then rm -Rf extension/dist/; fi

# Build the extension
mkdir extension/dist/
echo 'Building Extension...'

# Required for extension build rules
export INLINE_RUNTIME_CHUNK=false
export GENERATE_SOURCEMAP=false

npm run build

# Copy extension build files to extension/ folder
cp -r build/* extension/dist

# Browserify contentscript.js and background.js to pull in their imports
browserify extension/src/contentscript.js -o extension/dist/contentscript.js
browserify extension/src/background.js -o extension/dist/background.js

# Delete extension build from build/ folder (reserved for web app builds)
rm -Rf build

echo 'Extension built!'