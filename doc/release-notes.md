Bitcoin ABC version 0.19.9 is now available from:

  <https://download.bitcoinabc.org/0.19.9/>

This release includes the following features and fixes:
 - Return amounts from `decoderawtransaction` are padded to 8 decimal places.
 - Deprecated 'softforks' information from `getblockchaininfo` RPC call, which
   had only been reporting on some very old upgrades. To keep this information,
   start bitcoind with the '-deprecatedrpc=getblockchaininfo' option.
