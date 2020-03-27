Bitcoin ABC version 0.21.3 is now available from:

  <https://download.bitcoinabc.org/0.21.3/>

This release includes the following features and fixes:
 - Fixed a bug where the `listtransactions` RPC was unable to list transactions
   by a giving label.  This functionality has been restored.
 - MacOS versions earlier than 10.12 are no longer supported.
   Additionally, Bitcoin ABC does not yet change appearance when macOS
   "dark mode" is activated.
 - Fixed missing help text in `getblockchaininfo` RPC.

New RPC methods
------------
 - `listwalletdir` returns a list of wallets in the wallet directory which is
   configured with `-walletdir` parameter.

Low-level RPC changes
----------------------
 - `-usehd` was removed in version 0.19.7. From that version onwards, all new
   wallets created are hierarchical deterministic wallets. Version 0.21.3 makes
   specifying `-usehd` invalid config.

Thread names in logs
--------------------
 - Log lines can be prefixed with the name of the thread that caused the log.
To enable this behavior, use `-logthreadnames=1`.
