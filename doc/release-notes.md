# Bitcoin ABC 0.32.0 Release Notes

Bitcoin ABC version 0.32.0 is now available from:

  <https://download.bitcoinabc.org/0.32.0/>

Network upgrade
---------------

At the MTP time of `1763208000` (November 15, 2025 12:00:00 UTC), the following
changes will be activated:
 - Bump automatic replay protection to the next upgrade, timestamp `1778846400`
   (May 15, 2026 12:00:00 UTC).
 - The eCash scripts supports 64 bits integers and arithmetics. The range of
   valid integers in scripts is extended to [-9223372036854775807, 9223372036854775807].
 - The Heartbeat feature adds a new window to the real-time difficulty
   calculation. For miners using the value returned by the `getblocktemplate`
   RPC this is transparent and no change is required. For miners computing the
   value in the pool software the calculation needs to be updated. See
   https://e.cash/mining for more details.
 - The Avalanche Pre-Consensus feature is enabled. The nodes will start voting
   and reconcile transactions so they are finalized before being mined. See
   https://e.cash/blog/preconsensus-pr for more information on this new feature.
 - The Avalanche Staking Pre-Consensus feature is enabled. The nodes will start
   voting on the next staking reward winner, making sure the block template is
   selecting the same payout address across all miners. No change is required to
   the pool software.

To stay in sync with the network, node operators must update to version 0.32.x
before the November 15, 2025 upgrade is activated.
