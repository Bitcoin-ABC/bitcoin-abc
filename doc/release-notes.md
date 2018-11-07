Bitcoin ABC version 0.18.3 is now available from:

  <https://download.bitcoinabc.org/0.18.3/>

This release includes the following features and fixes:
 - Remove support for Qt4
 - Upgrade reproducible build to use Qt 5.9.6
 - Improve SHA256 performance using SSE4.1, AVX2 and/or SHA if available.
 - Add a mode argument to the `getmemoryinfo` RPC call to query `malloc_info` from the system if available.
 - Updated univalue library to version 1.0.4
 - Disable safe mode by default
 - Added autocomplete to 'help' in RPC console
 - Deprecated estimatefee RPC command
 - Improved help message for backup wallet RPC
 - Various bug fixes that improve node stability and performance
 - Backport getblock RPC's new verbosity mode from bitcoin core for retrieving all transactions of a given block in full.
 - Added parkblock/unparkblock RPC commands and 'parked' state to getchaintips RPC
 - RPC `listreceivedbyaddress` now accepts an address filter
 - Backport combinerawtransaction RPC from bitcoin core to combine multiple partially signed transactions into one transaction.
