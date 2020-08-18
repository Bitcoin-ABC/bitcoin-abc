Bitcoin ABC version 0.22.0 is now available from:

  <https://download.bitcoinabc.org/0.22.0/>

This release includes the following features and fixes:

 - Bump automatic replay protection to May 2021 upgrade.
 - Minor fixes to various RPC help texts.

Network upgrade
---------------

At the MTP time of `1605441600` (Nov 15, 2020 12:00:00 UTC), the following changes
will become activated:
 - Aserti3-2d difficulty adjustment algorithm (also known as the ASERT DAA).
 - Coinbase rule requiring at least 8% of the block reward to spend a single output to a common infrastructure fund.

RPC changes
-----------

RPCs which have an `include_watchonly` argument or `includeWatching`
option now default to `true` for watch-only wallets. Affected RPCs
are: `getbalance`, `listreceivedbyaddress`, `listreceivedbylabel`,
`listtransactions`, `listsinceblock`, `gettransaction`,
`walletcreatefundedpsbt`, and `fundrawtransaction`.
