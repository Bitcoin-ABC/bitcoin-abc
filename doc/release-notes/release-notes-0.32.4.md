# Bitcoin ABC 0.32.4 Release Notes

Bitcoin ABC version 0.32.4 is now available from:

  <https://download.bitcoinabc.org/0.32.4/>

This release includes the following features and fixes:
 - Reduced Avalanche Pre-Consensus verbosity in the logs. The finalized
   transactions are no longer printed to the `debug.log` file unless the
   `debug=avalanche` option is set.
 - Improved the block storage performance, which might make reindexing faster
   depending on the machine hardware.
 - Add a new Chronik endpoint `/unconfirmed-txs` to retrieve the mempool
   transactions.

Proof Manager
=============

A new executable `proof-manager-cli` is now part of the release. This offline
command line tool can decode, edit and encode Avalanche stakes, proofs and
delegations.
