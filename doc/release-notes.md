# Bitcoin ABC 0.28.8 Release Notes

Bitcoin ABC version 0.28.8 is now available from:

  <https://download.bitcoinabc.org/0.28.8/>

This release includes the following features and fixes:
 - Bitcoin ABC will no longer automatically create new wallets on startup. It will
   load existing wallets specified by `-wallet` options on the command line or in
   `bitcoin.conf` or `settings.json` files. And by default it will also load a
   top-level unnamed ("") wallet. However, if specified wallets don't exist,
   Bitcoin ABC will now just log warnings instead of creating new wallets with
   new keys and addresses like previous releases did.
   New wallets can be created through the GUI , through the `bitcoin-cli createwallet`
   or `bitcoin-wallet create` commands, or the `createwallet` RPC.
