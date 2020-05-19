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
