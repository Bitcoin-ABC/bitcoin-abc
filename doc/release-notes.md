Bitcoin ABC version 0.21.3 is now available from:

  <https://download.bitcoinabc.org/0.21.3/>

This release includes the following features and fixes:
 - Fixed a bug where the `listtransactions` RPC was unable to list transactions
   by a giving label.  This functionality has been restored.
 - MacOS versions earlier than 10.12 are no longer supported.
   Additionally, Bitcoin ABC does not yet change appearance when macOS
   "dark mode" is activated.

New RPC methods
------------
 - `listwalletdir` returns a list of wallets in the wallet directory which is
   configured with `-walletdir` parameter.

Low-level RPC changes
----------------------
 - `-usehd` was removed in version 0.16. From that version onwards, all new
 wallets created are hierarchical deterministic wallets. Version 0.18 makes
 specifying `-usehd` invalid config.
