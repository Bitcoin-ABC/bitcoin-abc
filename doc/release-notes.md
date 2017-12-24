Bitcoin ABC version 0.19.9 is now available from:

  <https://download.bitcoinabc.org/0.19.9/>

This release includes the following features and fixes:
 - Return amounts from `decoderawtransaction` are padded to 8 decimal places.
 - Deprecated 'softforks' information from `getblockchaininfo` RPC call, which
   had only been reporting on some very old upgrades. To keep this information,
   start bitcoind with the '-deprecatedrpc=getblockchaininfo' option.
 - A new `-avoidpartialspends` flag has been added (default=false). If enabled,
   the wallet will try to spend UTXO's that point at the same destination together.
   This is a privacy increase, as there will no longer be cases where a wallet will
   inadvertently spend only parts of the coins sent to the same address (note that
   if someone were to send coins to that address after it was used, those coins
   will still be included in future coin selections).
 - Add the `minrelaytxfee` output to the `getmempoolinfo` RPC.