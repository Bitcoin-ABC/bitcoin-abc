Bitcoin ABC version 0.19.1 is now available from:

  <https://download.bitcoinabc.org/0.19.1/>

This release includes the following features and fixes:
 - Add `signrawtransactionwithkey` and `signrawtransactionwithwallet` RPCs.
   These are specialized subsets of the `signrawtransaction` RPC.
 - Deprecate `nblocks` parameter in `estimatefee`.  See `bitcoin-cli help estimatefee` for more info. Use `-deprecatedrpc=estimatefee` to temporarily re-enable the old behavior while you migrate.
 - Minor bug fixes and wallet UI cleanup
 - Removed `txconfirmtarget` option from bitcoind
