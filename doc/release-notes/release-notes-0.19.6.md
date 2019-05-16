Bitcoin ABC version 0.19.6 is now available from:

  <https://download.bitcoinabc.org/0.19.6/>

This release includes the following features and fixes:
 - Using addresses in createmultisig is now deprectated. Use `-deprecatedrpc=createmultisig` to get the old behavior.
 - Added `savemempool` RPC command for dumping mempool to disk.
 - Added `-blocksdir` command line option for saving block data to a different disk location (such as a higher-capacity HDD).
 - Fixed a few related issues where quickly shutting down bitcoind after startup would result in a crash.
 - Multiple minor node stability improvements.
 - Fixed a small memory leak.
 - Removed `-nodebug` option, as `-debug=0` already exists as an equivalent.
 - Fixed a bug where `bitcoin-cli generate` would hang until completion when attempting to interrupt the process.
   It now shuts down cleanly as expected.
