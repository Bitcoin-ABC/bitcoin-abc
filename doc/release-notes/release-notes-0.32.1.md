# Bitcoin ABC 0.32.1 Release Notes

Bitcoin ABC version 0.32.1 is now available from:

  <https://download.bitcoinabc.org/0.32.1/>

This release includes the following features and fixes:
 - A new `finalizetransaction` is added to force finalize a transaction locally.
   This makes it possible for miners to add a mempool transaction to the block
   template, but it should be used with caution as the node might be out of
   consensus with the Avalanche stakers. See the RPC documentation for more
   details.
 - A new `removetransaction` is added to force remove a transaction from the
   node mempool. This makes it also possible for miners to remove the
   transaction from the block template. See the RPC documentation for more
   details.
