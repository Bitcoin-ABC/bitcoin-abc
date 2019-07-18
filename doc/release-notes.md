Bitcoin ABC version 0.22.0 is now available from:

  <https://download.bitcoinabc.org/0.22.0/>

This release includes the following features and fixes:

RPC changes
-----------

RPCs which have an `include_watchonly` argument or `includeWatching`
option now default to `true` for watch-only wallets. Affected RPCs
are: `getbalance`, `listreceivedbyaddress`, `listreceivedbylabel`,
`listtransactions`, `listsinceblock`, `gettransaction`,
`walletcreatefundedpsbt`, and `fundrawtransaction`.
