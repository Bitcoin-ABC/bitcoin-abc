# Bitcoin ABC 0.29.11 Release Notes

Bitcoin ABC version 0.29.11 is now available from:

  <https://download.bitcoinabc.org/0.29.11/>

This release includes the following features and fixes:
 - A new `gettransactionstatus` RPC has been added to retrieve the status of a
   transaction, whether it's accepted in the mempool, is an orphan, or is a
   conflicting transaction. If the transaction indexer (`txindex`) is enabled,
   it also returns the hash of the block in which the transaction has been
   mined.
