# Bitcoin ABC 0.34.0 Release Notes

Bitcoin ABC version 0.34.0 is now available from:

  <https://download.bitcoinabc.org/0.34.0/>

This release includes the following features and fixes:
 - A bug has been fixed in `proof-manager-cli` that could incorrectly report an invalid Avalanche proof delegation as valid.

Network upgrade
---------------

At the MTP time of `1794744000` (November 15, 2026 12:00:00 UTC), the following changes will be activated:
 - Bump automatic replay protection to the next upgrade, timestamp `1810382400` (May 15, 2027 12:00:00 UTC).

To stay in sync with the network, node operators must update to version 0.34.x before the November 15, 2026 upgrade is activated.
