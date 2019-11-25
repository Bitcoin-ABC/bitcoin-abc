Bitcoin ABC version 0.20.7 is now available from:

  <https://download.bitcoinabc.org/0.20.7/>

This release includes the following features and fixes:
 - The new RPC `scantxoutset` can be used to scan the UTXO set for entries
   that match certain output descriptors. Refer to the [output descriptors
   reference documentation](/doc/descriptors.md) for more details. This call
   is similar to `listunspent` but does not use a wallet, meaning that the
   wallet can be disabled at compile or run time. This call is experimental,
   as such, is subject to changes or removal in future releases.
 - The new RPC `getzmqnotifications` returns information about active ZMQ
   notifications.
