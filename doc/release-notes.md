Bitcoin ABC version 0.21.6 is now available from:

  <https://download.bitcoinabc.org/0.21.6/>

This release includes the following features and fixes:
 - The autotools build system (`autogen`, `configure`, ...) is deprecated and
   will be removed in a future release. Cmake is the replacement build system,
   look at the documentation for the build instructions. To continue using the
   autotools build system, pass the --enable-deprecated-build-system flag to
   `configure`.
