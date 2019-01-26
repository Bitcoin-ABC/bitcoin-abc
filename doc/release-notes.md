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

