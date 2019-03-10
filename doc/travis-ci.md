Travis CI
=========

Support for using travis-ci has been added in order to automate pull-testing.
See [travis-ci.org](https://travis-ci.org/) for more info

This procedure is different than the pull-tester that came before it in a few
ways.

There is nothing to administer. This is a major feature as it means
that builds have no local state. Because there is no ability to login to the
builders to install packages (tools, dependencies, etc), the entire build
procedure must instead be controlled by a declarative script `.travis.yml`.
This script declares each build configuration, creates virtual machines as
necessary, builds, then discards the virtual machines.

A build matrix is constructed to test a wide range of configurations, rather
than a single pass/fail. This helps to catch build failures and logic errors
that present on platforms other than the ones the author has tested. This
matrix is defined in the build script and can be changed at any time.

All builders use the dependency-generator in the [depends dir](/depends), rather than
using apt-get to install build dependencies. This guarantees that the tester
is using the same versions as Gitian, so the build results are nearly identical
to what would be found in a final release. However, this also means that builds
will fail if new dependencies are introduced without being added to the
dependency generator.

In order to avoid rebuilding all dependencies for each build, the binaries are
cached and re-used when possible. Changes in the dependency-generator will
trigger cache-invalidation and rebuilds as necessary.

These caches can be manually removed if necessary. This is one of the very few
manual operations that is possible with Travis, and it can be done by the
Devault Core committer via the Travis web interface.

In some cases, secure strings may be needed for hiding sensitive info such as
private keys or URLs. The travis client may be used to create these strings:
http://docs.travis-ci.com/user/encryption-keys/

For the details of the build descriptor, see the official docs:
http://docs.travis-ci.com/user/build-configuration/
