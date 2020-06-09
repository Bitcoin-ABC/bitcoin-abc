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

Rescanning the blockchain is required, to correctly mark previously
used destinations.

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
- getbalances
- sendtoaddress

In addition, `sendtoaddress` has been changed to avoid partial spends when `avoid_reuse`
`avoid_reuse` is enabled.	is enabled (if not already enabled via the  `-avoidpartialspends` command line flag),
as it would otherwise risk using up the "wrong" UTXO for an address reuse case.

The listunspent RPC has also been updated to now include a "reused" bool, for nodes
with "avoid_reuse" enabled.


Miscellaneous RPC changes
------------

- `createwallet` can now create encrypted wallets if a non-empty passphrase is specified.


Configuration
-------------

The outbound message high water mark of the ZMQ PUB sockets are now
configurable via the options:

`-zmqpubhashtxhwm=n`

`-zmqpubhashblockhwm=n`

`-zmqpubrawblockhwm=n`

`-zmqpubrawtxhwm=n`

Each high water mark value must be an integer greater than or equal to 0.
The high water mark limits the maximum number of messages that ZMQ will
queue in memory for any single subscriber. A value of 0 means no limit.
When not specified, the default value continues to be 1000.
When a ZMQ PUB socket reaches its high water mark for a subscriber, then
additional messages to the subscriber are dropped until the number of
queued messages again falls below the high water mark value.

Change in automatic banning
---------------------------

Automatic banning of peers for bad behavior has been slightly altered:

- automatic bans will no longer time out automatically after 24 hours.
  Depending on traffic from other peers, automatic bans may time out at an
  indeterminate time.
- automatic bans will no longer be persisted over restarts. Only manual bans
  will be persisted.
- automatic bans will no longer be returned by the `listbanned` RPC.
- automatic bans can no longer be lifted with the `setban remove` RPC command.
  If you need to remove an automatic ban, you can clear all bans (including
  manual bans) with the `clearbanned` RPC, or stop-start to clear automatic bans.
- automatic bans are now referred to as discouraged nodes in log output, as
  they're not (and weren't) strictly banned: incoming connections are still
  allowed from them, but they're preferred for eviction.
