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
