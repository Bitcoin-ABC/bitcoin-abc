# Bitcoin ABC 0.28.0 Release Notes

Bitcoin ABC version 0.28.0 is now available from:

  <https://download.bitcoinabc.org/0.28.0/>

Network upgrade
---------------

At the MTP time of `1700049600` (November 15, 2023 12:00:00 UTC), the following
changes will become activated:
 - The miner fund ratio is increased to 32% of the coinbase reward.
 - The staking reward output is added to the coinbase transaction. It sends 10%
   of the block reward to a payout address selected from the avalanche network.
   Blocks that don't include or have an incorrect output will be rejected by the
   avalanche network.
 - Bump automatic replay protection to the next upgrade, timestamp `1715774400`
   (May 15, 2024 12:00:00 UTC).
