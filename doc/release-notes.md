Bitcoin ABC version 0.22.2 is now available from:

  <https://download.bitcoinabc.org/0.22.2/>

This release includes the following features and fixes:
 - New `minerfund` subfield of `coinbasetxn` in `getblocktemplate` to enable
   easy fetching of valid addresses for infrastructure funding.

RPC changes
-----------
The `gettransaction` RPC now accepts a third (boolean) argument `verbose`. If
set to `true`, a new `decoded` field will be added to the response containing
the decoded transaction. This field is equivalent to RPC `decoderawtransaction`,
or RPC `getrawtransaction` when `verbose` is passed.
