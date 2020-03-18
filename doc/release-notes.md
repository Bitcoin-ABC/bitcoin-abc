Bitcoin ABC version 0.21.3 is now available from:

  <https://download.bitcoinabc.org/0.21.3/>

This release includes the following features and fixes:
 - Fixed a bug where the `listtransactions` RPC was unable to list transactions
   by a giving label.  This functionality has been restored.

Low-level RPC changes
----------------------
 - `-usehd` was removed in version 0.16. From that version onwards, all new
 wallets created are hierarchical deterministic wallets. Version 0.18 makes
 specifying `-usehd` invalid config.
