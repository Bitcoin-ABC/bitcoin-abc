Bitcoin ABC version 0.21.5 is now available from:

  <https://download.bitcoinabc.org/0.21.5/>

This release includes the following features and fixes:
 - Removed deprecated `getinfo` RPC.
 - Update univalue to 1.0.5
 - The Official Ubuntu PPA will no longer update the package for the 16.04
   Xenial version. The most recent versions can still be downloaded from
   bitcoinabc.org. The PPA is now offering a package for 20.04 Focal.
 - Minor performance improvements for JSON RPC calls that fetch headers or blocks.
 - Various minor bug fixes.

Tests
-----
 - The regression test chain, that can be enabled by the `-regtest` command line
   flag, now requires transactions to not violate standard policy by default.
   Making the default the same as mainnet makes it easier to test mainnet
   behavior on regtest. Be reminded that the testnet still allows non-standard
   txs by default and that the policy can be locally adjusted with the
   `-acceptnonstdtxn` command line flag for both test chains.

Configuration
-------------
 - An error is issued where previously a warning was issued when a setting in
   the config file was specified in the default section, but not overridden for
   the selected network. This change takes only effect if the selected network
   is not mainnet.
 - The `echo` RPC will now return an internal bug report if exactly 100
   arguments are provided.

Tools
-----
 - A new `bitcoin-wallet` tool is now available, distributed alongside our usual binaries.
   This tool provides a way to create new wallet files and inspect basic information about
   a wallet without using any RPCs.

Wallet `generate` RPC method deprecated
---------------------------------------
 - The wallet's `generate` RPC method has been deprecated and will be fully
   removed in v0.22.
 - `generate` is only used for testing. The RPC call reaches across multiple
    subsystems (wallet and mining), so is deprecated to simplify the
    wallet-node interface. Projects that are using `generate` for testing
    purposes should transition to using the `generatetoaddress` call, which
    does not require or use the wallet component. Calling `generatetoaddress`
    with an address returned by `getnewaddress` gives the same functionality as
    the old `generate` method.
 - To continue using `generate` in v0.21, restart bitcoind with the
   `-deprecatedrpc=generate` configuration.
