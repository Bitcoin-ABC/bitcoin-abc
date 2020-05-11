Bitcoin ABC version 0.21.6 is now available from:

  <https://download.bitcoinabc.org/0.21.6/>

This release includes the following features and fixes:
 - The autotools build system (`autogen`, `configure`, ...) is deprecated and
   will be removed in a future release. Cmake is the replacement build system,
   look at the documentation for the build instructions. To continue using the
   autotools build system, pass the --enable-deprecated-build-system flag to
   `configure`.
 - The rpcallowip option can no longer be used to automatically listen
   on all network interfaces. Instead, the rpcbind parameter must also
   be used to specify the IP addresses to listen on. Listening for RPC
   commands over a public network connection is insecure and should be
   disabled, so a warning is now printed if a user selects such a
   configuration. If you need to expose RPC in order to use a tool
   like Docker, ensure you only bind RPC to your localhost, e.g. docker run [...] -p 127.0.0.1:8332:8332 (this is an extra :8332 over the
   normal Docker port specification).
 - The `getmininginfo` RPC now omits `currentblocksize` and `currentblocktx`
   when a block was never assembled via RPC on this node.
 - Manpages added for the bitcoin-wallet tool.
 - Fixed a bug where an already-banned peer later whitelisted with `noban` would still be treated as banned.
 - Improved performance of JSON RPC calls by ~4%.
