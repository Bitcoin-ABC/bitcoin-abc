Bitcoin ABC version 0.19.8 is now available from:

  <https://download.bitcoinabc.org/0.19.8/>

This release includes the following features and fixes:
 - Remove `getinfo` RPC in favor of `getblockchaininfo`, `getnetworkinfo` and `getwalletinfo`.
 - `./bitcoin-cli -getinfo` will now throw a runtime error if there are any extra arguments after it.
 - Fixed a race condition in sendrawtransaction
 - Deprecated large parts of `validateaddress` and introduced `getaddressinfo` to replace the parts that were deprecated.
   See RPC help for details.
 - Minor logging improvements.
 - Various visual fixes and minor improvements in the wallet.
 - Local address broadcasting changed from every 9 hours to every 24 hours.
