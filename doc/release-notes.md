# Bitcoin ABC 0.27.13 Release Notes

Bitcoin ABC version 0.27.13 is now available from:

  <https://download.bitcoinabc.org/0.27.13/>

This release includes the following features and fixes:
  - The `fundrawtransaction`, `send` and `walletcreatefundedpsbt` RPCs now support an `include_unsafe` option
    that when `true` allows using unconfirmed inputs received from other wallets to fund the transaction.
    Note that the resulting transaction may become invalid if one of the unsafe inputs disappears.
