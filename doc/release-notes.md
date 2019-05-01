Bitcoin ABC version 0.21.9 is now available from:

  <https://download.bitcoinabc.org/0.21.9/>

This release includes the following features and fixes:
- Improve management of maxfee by the wallet.

Wallet changes
--------------
When creating a transaction with a fee above `-maxtxfee` (default 0.1 BCH),
the RPC commands `walletcreatefundedpsbt` and  `fundrawtransaction` will now fail
instead of rounding down the fee. Beware that the `feeRate` argument is specified
in BCH per kilobyte, not satoshi per byte.

New RPCs
--------

- `getbalances` returns an object with all balances (`mine`,
  `untrusted_pending` and `immature`). Please refer to the RPC help of
  `getbalances` for details. The new RPC is intended to replace
  `getunconfirmedbalance` and the balance fields in `getwalletinfo`, as well as
  `getbalance`. The old calls may be removed in a future version.

RPC changes
-----------
The `getblockstats` RPC is faster for fee calculation by using BlockUndo data. Also, `-txindex` is no longer required and `getblockstats` works for all non-pruned blocks.

Miscellaneous RPC changes
------------

- `createwallet` can now create encrypted wallets if a non-empty passphrase is specified.
