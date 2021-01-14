# Bitcoin ABC 0.22.12 Release Notes

Bitcoin ABC version 0.22.12 is now available from:

  <https://download.bitcoinabc.org/0.22.12/>

This release includes the following features and fixes:
 - Add an extra 64 bits of entropy in the initial version message.
 - The `setexcessiveblock` RPC is deprecated and will be removed in a future
   version. The `-excessiveblocksize` option should be used instead. Use the
   `-deprecatedrpc=setexcessiveblock` option to continue using the
   `setexcessiveblock` RPC.
