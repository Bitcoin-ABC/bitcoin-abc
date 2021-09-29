# Bitcoin ABC 0.23.8 Release Notes

Bitcoin ABC version 0.23.8 is now available from:

  <https://download.bitcoinabc.org/0.23.8/>

This release includes the following features and fixes:
 - Add a new option `-networkactive` to enable all P2P network activity
   (default 1). To start a node offline, you can provide
   `-networkactive=0` or `-nonetworkactive`.
 - The deprecated `setexcessiveblock` RPC has been removed and is no longer
   available. The `-excessiveblocksize` option should be used instead.
