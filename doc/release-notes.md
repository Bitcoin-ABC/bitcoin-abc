Bitcoin ABC version 0.20.11 is now available from:

  <https://download.bitcoinabc.org/0.20.11/>

This release includes the following features and fixes:
 - The `prioritisetransaction` RPC no longer takes a `priority_delta` argument,
   which is replaced by a `dummy` argument for backwards compatibility with
   clients using positional arguments. The RPC is still used to change the
   apparent fee-rate of the transaction by using the `fee_delta` argument.
