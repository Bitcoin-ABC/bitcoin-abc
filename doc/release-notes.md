# Bitcoin ABC 0.22.6 Release Notes

Bitcoin ABC version 0.22.6 is now available from:

  <https://download.bitcoinabc.org/0.22.6/>

This release includes the following features and fixes:

Updated RPCs
------------

- `walletprocesspsbt` and `walletcreatefundedpsbt` now include BIP 32
  derivation paths by default for public keys if we know them. This can be
  disabled by setting `bip32derivs` to `false`.
