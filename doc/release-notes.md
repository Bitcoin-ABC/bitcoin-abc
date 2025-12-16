# Bitcoin ABC 0.32.5 Release Notes

Bitcoin ABC version 0.32.5 is now available from:

  <https://download.bitcoinabc.org/0.32.5/>

This release includes the following features and fixes:
 - The `getblock` RPC command now supports verbosity level 3 containing
   transaction inputs `prevout` information. The existing `/rest/block/` REST
   endpoint is modified to contain this information too.
   Every `vin` field will contain an additional `prevout` subfield describing
   the spent output. `prevout` contains the following keys:
    - `generated` - true if the spent coins was a coinbase.
    - `height`
    - `value`
    - `scriptPubKey`
 - The `gettransaction` RPC command now returns `"ischange": true` for the
   change output (if any). The field is absent for non change outputs. Please
   refer to the `gettransaction` documentation for details.
 - A new `getfinaltransactions` RPC command returns a list of the finalized
   transactions that are not yet included in a finalized block. Please refer to
   the RPC documentation for more details.
 - A new Chronik `finalization_timeout_secs` parameter is available for the
   `BroadcastTxRequest` and `BroadcastTxsRequest` messages. When non-zero this
   parameter instructs Chronik to wait until the transaction is finalized or
   until the timeout expires before returning.
