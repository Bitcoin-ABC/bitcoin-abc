Windows Binary Builds
=====================

✓ _This build is reproducible: you should be able to generate
   binaries that match the official releases (i.e. with the same sha256 hash)._

In order to build for Windows, you must use docker.
Don't worry! It's fast and produces 100% reproducible builds.
You may do so by issuing the following command (from the top-level of this
repository)::

    $ contrib/make_clean
    $ git checkout BRANCH_OR_TAG
    $ contrib/build-wine/build.sh

Where BRANCH_OR_TAG above is a git branch or tag you wish to build.

The `make_clean` command can be omitted for testing purposes, if you want
local uncommited changes to be included in the built .exe files.

The built .exe files will be placed in: `dist/`

