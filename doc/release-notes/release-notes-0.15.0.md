Bitcoin ABC version 0.15.0 is now available from:

  <https://download.bitcoinabc.org/0.15.0/>

This release includes the following features and fixes:

- Reserve block space for high priority transactions (D485)
- Use "bitcoincash:" URI (D466)
- Add and accept Bitcoin Cash networking magic (D400)
- Peer preferentially with NODE_CASH nodes (D457)
- Hardcoded seeds update (D403)
- Remove UAHF RPC calls, and some of the UAHF activation logic (D407, D417)
- Various test fixes and other cleanups now that UAHF activation is past
- Various changes now that we do replay protected txns only (D437, D440, D442, D444, D451, D455, D456)
- Make SCRIPT_VERIFY_STRICTENC a mandatory flag (D421)
- Fix RPC signrawtransaction silently accepting missing amount field (D449)
- Fix a some small memory leaks, and an overflow (D372, D452, D472)
- Added sanitizer support (D474, D481)
- Rename package to bitcoin-abc-* (D482, D489, D510, D513)
- Cryptographic randomness improvements (backport from Core PR9821 and PR9792) (D488, D490)
- Store the UTXO set on a per output basis rather than a per transaction basis (backport from Core)
- Various other backports and fixes from Core
- Various fixes and improvements to test suite
- Various code cleanups and style improvements
- Low level RPC error code changes (D500 / backport of PR9853)

Low-level RPC changes (D500)
----------------------------

- Error codes have been updated to be more accurate for the following error cases:
  - `getblock` now returns RPC_MISC_ERROR if the block can't be found on disk (for
  example if the block has been pruned). Previously returned RPC_INTERNAL_ERROR.
  - `pruneblockchain` now returns RPC_MISC_ERROR if the blocks cannot be pruned
  because the node is not in pruned mode. Previously returned RPC_METHOD_NOT_FOUND.
  - `pruneblockchain` now returns RPC_INVALID_PARAMETER if the blocks cannot be pruned
  because the supplied timestamp is too late. Previously returned RPC_INTERNAL_ERROR.
  - `pruneblockchain` now returns RPC_MISC_ERROR if the blocks cannot be pruned
  because the blockchain is too short. Previously returned RPC_INTERNAL_ERROR.
  - `setban` now returns RPC_CLIENT_INVALID_IP_OR_SUBNET if the supplied IP address
  or subnet is invalid. Previously returned RPC_CLIENT_NODE_ALREADY_ADDED.
  - `setban` now returns RPC_CLIENT_INVALID_IP_OR_SUBNET if the user tries to unban
  a node that has not previously been banned. Previously returned RPC_MISC_ERROR.
  - `removeprunedfunds` now returns RPC_WALLET_ERROR if bitcoind is unable to remove
  the transaction. Previously returned RPC_INTERNAL_ERROR.
  - `removeprunedfunds` now returns RPC_INVALID_PARAMETER if the transaction does not
  exist in the wallet. Previously returned RPC_INTERNAL_ERROR.
  - `fundrawtransaction` now returns RPC_INVALID_ADDRESS_OR_KEY if an invalid change
  address is provided. Previously returned RPC_INVALID_PARAMETER.
  - `fundrawtransaction` now returns RPC_WALLET_ERROR if bitcoind is unable to create
  the transaction. The error message provides further details. Previously returned
  RPC_INTERNAL_ERROR.
  - The `gettxoutsetinfo` response now contains `disk_size` and `bogosize` instead of
    `bytes_serialized`. The first is a more accurate estimate of actual disk usage, but
    is not deterministic. The second is unrelated to disk usage, but is a
    database-independent metric of UTXO set size: it counts every UTXO entry as 50 + the
    length of its scriptPubKey.

Reserve block space for high priority transactions (D485)
---------------------------------------------------------

By default reserve 5% of the max generated block size parameter to hiprio transactions.
Hence a `bitcoind` instance running with an unmodified configuration will reserve 100K
for high priority transactions. The parameter name used for this configuration
`blockprioritypercentage`. While introducing this new parameter we deprecated
`blockprioritysize`(it was used to specify the amount of high prio reserved area in byte).

A transaction is considered high priority if its priority is higher than this threshold: `COIN * 144 / 250`,
where COIN is the value of a one bitcoin UTXO expressed in satoshis. Thus a transaction
who as an input of 1 bitcoin and are 144 blocks old and whose size is 250 bytes is considered
the priority cut-off.
