# Bitcoin ABC 0.26.2 Release Notes

Bitcoin ABC version 0.26.2 is now available from:

  <https://download.bitcoinabc.org/0.26.2/>

This release includes the following features and fixes:
 - The deprecated `addnode` and `whitelisted` fields have been removed from the
   `getpeerinfo` RPC output. Users relying on the `deprecatedrpc` behavior need
   to update their system accordingly.
 - The `isfinaltransaction` RPC now returns a detailed error when the
   transaction is not found, instead of simply returning false.
 - Some log messages have been moved to debug categories, to improve the
   signal-to-noise ratio. Users relying on these log messages can enable them
   with the `-debug=blockstore,validation` command-line argument.
