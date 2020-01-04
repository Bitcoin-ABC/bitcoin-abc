Bitcoin ABC version 0.20.10 is now available from:

  <https://download.bitcoinabc.org/0.20.10/>

This release includes the following features and fixes:
 - Remove deprecated "startingpriority" and "currentpriority" from
   `getrawmempool`, `getmempoolancestors`, `getmempooldescendants` and
   `getmempoolentry` RPC.
 - The `prioritisetransaction` RPC no longer takes a `priority_delta` argument,
   which is replaced by a `dummy` argument for backwards compatibility with
   clients using positional arguments. The RPC is still used to change the
   apparent fee-rate of the transaction by using the `fee_delta` argument.
