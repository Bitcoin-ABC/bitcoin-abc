Bitcoin ABC version 0.21.9 is now available from:

  <https://download.bitcoinabc.org/0.21.9/>

This release includes the following features and fixes:
- Improve management of maxfee by the wallet.

- The `-enablebip61` command line option (introduced in Bitcoin ABC 0.19.11) is
used to toggle sending of BIP 61 reject messages. Reject messages have no use
case on the P2P network and are only logged for debugging by most network
nodes. The option will now by default be off for improved privacy and security
as well as reduced upload usage. The option can explicitly be turned on for
local-network debugging purposes.

Wallet changes
--------------
When creating a transaction with a fee above `-maxtxfee` (default 0.1 BCH),
the RPC commands `walletcreatefundedpsbt` and  `fundrawtransaction` will now fail
instead of rounding down the fee. Beware that the `feeRate` argument is specified
in BCH per kilobyte, not satoshi per byte.


Coin selection
--------------

### Reuse Avoidance

A new wallet flag `avoid_reuse` has been added (default off). When enabled,
a wallet will distinguish between used and unused addresses, and default to not
use the former in coin selection.

(Note: rescanning the blockchain is required, to correctly mark previously
used destinations.)

Together with "avoid partial spends" (present as of Bitcoin ABC v0.19.9), this
addresses a serious privacy issue where a malicious user can track spends by
peppering a previously paid to address with near-dust outputs, which would then
be inadvertently included in future payments.


New RPCs
--------

- `getbalances` returns an object with all balances (`mine`,
  `untrusted_pending` and `immature`). Please refer to the RPC help of
  `getbalances` for details. The new RPC is intended to replace
  `getunconfirmedbalance` and the balance fields in `getwalletinfo`, as well as
  `getbalance`. The old calls may be removed in a future version.

- A new `setwalletflag` RPC sets/unsets flags for an existing wallet.


RPC changes
-----------

The `getblockstats` RPC is faster for fee calculation by using BlockUndo data. Also, `-txindex` is no longer required and `getblockstats` works for all non-pruned blocks.

Several RPCs have been updated to include an "avoid_reuse" flag, used to control
whether already used addresses should be left out or included in the operation.
These include:

- createwallet
- getbalance
- sendtoaddress

In addition, `sendtoaddress` has been changed to enable `-avoidpartialspends` when
`avoid_reuse` is enabled.

The listunspent RPC has also been updated to now include a "reused" bool, for nodes
with "avoid_reuse" enabled.


Miscellaneous RPC changes
------------

- `createwallet` can now create encrypted wallets if a non-empty passphrase is specified.
