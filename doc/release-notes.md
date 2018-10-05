Bitcoin ABC version 0.21.8 is now available from:

  <https://download.bitcoinabc.org/0.21.8/>

This release includes the following features and fixes:

Updated RPCs
------------

- The `getrawtransaction` RPC no longer checks the unspent UTXO set for
  a transaction. The remaining behaviors are as follows: 1. If a
  blockhash is provided, check the corresponding block. 2. If no
  blockhash is provided, check the mempool. 3. If no blockhash is
  provided but txindex is enabled, also check txindex.
- `getaddressinfo` now reports `solvable`, a boolean indicating whether
  all information necessary for signing is present in the wallet
  (ignoring private keys).
- `getaddressinfo`, `listunspent`, and `scantxoutset` have a new output
  field `desc`, an output descriptor that encapsulates all signing information
  and key paths for the address (only available when `solvable` is true for
  `getaddressinfo` and `listunspent`).
- The `importmulti` RPC will now contain a new per-request `warnings`
  field with strings that explain when fields are being ignored or
  inconsistent, if any.

RPC importprivkey: new label behavior
-------------------------------------

Previously, `importprivkey` automatically added the default empty label
("") to all addresses associated with the imported private key.  Now it
defaults to using any existing label for those addresses.  For example:

- Old behavior: you import a watch-only address with the label "cold
  wallet".  Later, you import the corresponding private key using the
  default settings.  The address's label is changed from "cold wallet"
  to "".

- New behavior: you import a watch-only address with the label "cold
  wallet".  Later, you import the corresponding private key using the
  default settings.  The address's label remains "cold wallet".

In both the previous and current case, if you directly specify a label
during the import, that label will override whatever previous label the
addresses may have had.  Also in both cases, if none of the addresses
previously had a label, they will still receive the default empty label
("").  Examples:

- You import a watch-only address with the label "temporary".  Later you
  import the corresponding private key with the label "final".  The
  address's label will be changed to "final".

- You use the default settings to import a private key for an address that
  was not previously in the wallet.  Its addresses will receive the default
  empty label ("").
