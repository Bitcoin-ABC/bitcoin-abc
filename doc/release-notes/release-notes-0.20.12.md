Bitcoin ABC version 0.20.12 is now available from:

  <https://download.bitcoinabc.org/0.20.12/>

This release includes the following features and fixes:
 - The `unloadwallet` RPC is now synchronous, meaning that it blocks until the
   wallet is fully unloaded.
 - Fixed a bug where wallet handles were not being freed correctly, effectively causing
   a memory leak when many wallets were called via `loadwallet` and `unloadwallet`.
 - Better error reporting for parsing errors in configuration files.
