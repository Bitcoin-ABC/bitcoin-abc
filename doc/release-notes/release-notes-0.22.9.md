# Bitcoin ABC 0.22.9 Release Notes

Bitcoin ABC version 0.22.9 is now available from:

  <https://download.bitcoinabc.org/0.22.9/>

This release includes the following features and fixes:

# Wallet

The `-salvagewallet` startup option has been removed. A new `salvage` command has
been added to the `bitcoin-wallet` tool which performs the salvage operations
that `-salvagewallet` did.

# RPC changes

The `walletcreatefundedpsbt` RPC call will now fail with `Insufficient funds`
when inputs are manually selected but are not enough to cover the outputs and
fee. Additional inputs can automatically be added through the new `add_inputs`
option.

The `fundrawtransaction` RPC now supports `add_inputs` option that when `false`
prevents adding more inputs if necessary and consequently the RPC fails.