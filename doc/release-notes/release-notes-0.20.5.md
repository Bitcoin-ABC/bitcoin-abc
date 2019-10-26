Bitcoin ABC version 0.20.5 is now available from:

  <https://download.bitcoinabc.org/0.20.5/>

This release includes the following features and fixes:
 - It is now possible to unload wallets dynamically at runtime. This feature is
   currently only available through the RPC interface.

GUI changes
-----------
 - Wallets loaded dynamically through the RPC interface may now be displayed in
   the bitcoin-qt GUI.
 - The default wallet will now be labeled `[default wallet]` in the bitcoin-qt
   GUI if no name is provided by the `-wallet` option on start up.
 - Wallets dynamically unloaded will now be reflected in the gui.
 - Block storage can be limited under Preferences, in the Main tab. Undoing
   this setting requires downloading the full blockchain again. This mode is
   incompatible with -txindex and -rescan.
