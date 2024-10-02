# Bitcoin ABC 0.30.0 Release Notes

Bitcoin ABC version 0.30.0 is now available from:

  <https://download.bitcoinabc.org/0.30.0/>

Network upgrade
---------------

At the MTP time of `1731672000` (November 15, 2024 12:00:00 UTC), the following
changes will be activated:
 - Bump automatic replay protection to the next upgrade, timestamp `1747310400`
   (May 15, 2025 12:00:00 UTC).
 - Real time targeting, also known as the Heartbeat feature, will be enforced on
   the eCash network. This makes it more difficult to mine blocks faster than
   the expected 10 minutes average, preventing large bumps in difficulty that
   can lead to inconsistent block intervals. Miners need to update their setup
   according to the instructions from the [eCash website](https://e.cash/mining).
