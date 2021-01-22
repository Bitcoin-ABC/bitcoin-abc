# Bitcoin ABC 0.22.12 Release Notes

Bitcoin ABC version 0.22.12 is now available from:

  <https://download.bitcoinabc.org/0.22.12/>

This release includes the following features and fixes:
 - Add an extra 64 bits of entropy in the initial version message.
 - The `setexcessiveblock` RPC is deprecated and will be removed in a future
   version. The `-excessiveblocksize` option should be used instead. Use the
   `-deprecatedrpc=setexcessiveblock` option to continue using the
   `setexcessiveblock` RPC.
 - The mempool now tracks whether transactions submitted via the wallet or RPCs
   have been successfully broadcast. Every 10-15 minutes, the node will try to
   announce unbroadcast transactions until a peer requests it via a `getdata`
   message or the transaction is removed from the mempool for other reasons.
   The node will not track the broadcast status of transactions submitted to the
   node using P2P relay. This version reduces the initial broadcast guarantees
   for wallet transactions submitted via P2P to a node running the wallet.
 - `getmempoolinfo` now returns an additional `unbroadcastcount` field. The
   mempool tracks locally submitted transactions until their initial broadcast
   is acknowledged by a peer. This field returns the count of transactions
   waiting for acknowledgement.
 - Mempool RPCs such as `getmempoolentry` and `getrawmempool` with
   `verbose=true` now return an additional `unbroadcast` field. This indicates
   whether initial broadcast of the transaction has been acknowledged by a
   peer. `getmempoolancestors` and `getmempooldescendants` are also updated.
