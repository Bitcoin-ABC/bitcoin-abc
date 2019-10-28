Bitcoin ABC version 0.21.5 is now available from:

  <https://download.bitcoinabc.org/0.21.5/>

This release includes the following features and fixes:
 - Removed deprecated `getinfo` RPC.
 - Update univalue to 1.0.5

Tests
-----

- The regression test chain, that can be enabled by the `-regtest` command line
  flag, now requires transactions to not violate standard policy by default.
  Making the default the same as for mainnet, makes it easier to test mainnet
  behavior on regtest. Be reminded that the testnet still allows non-standard
  txs by default and that the policy can be locally adjusted with the
  `-acceptnonstdtxn` command line flag for both test chains.

Configuration
------------

* An error is issued where previously a warning was issued when a setting in
  the config file was specified in the default section, but not overridden for
  the selected network. This change takes only effect if the selected network
  is not mainnet.

 - The `echo` RPC will now return an internal bug report if exactly 100
   arguments are provided.
