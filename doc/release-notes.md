DeVault version 1.0.0 is now available from:

  <https://github.com/devaultcrypto/devault/>

This release includes the following features and fixes:
 - Cold Rewards Code
 - Add `signrawtransactionwithkey` and `signrawtransactionwithwallet` RPCs.
   These are specialized subsets of the `signrawtransaction` RPC.
 - Deprecate `nblocks` parameter in `estimatefee`.  See `bitcoin-cli help estimatefee` for more info. Use `-deprecatedrpc=estimatefee` to temporarily re-enable the old behavior while you migrate.
