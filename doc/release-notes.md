# Bitcoin ABC 0.26.8 Release Notes

Bitcoin ABC version 0.26.8 is now available from:

  <https://download.bitcoinabc.org/0.26.8/>

This release includes the following features and fixes:
 - Add a new RPC `getblockfrompeer` which permits requesting a specific block from
   a specific peer manually. The intended use is acquisition of stale chaintips
   for fork monitoring and research purposes.
 - Add a new wallet RPC `restorewallet` to restore a wallet from a backup file
   created with the `backupwallet` RPC.
 - The `bytespersigop` option has been deprecated and the more accurate
   `-bytespersigcheck` should be used instead.
 - The `sigops` and `sigoplimit` fields of the `getblocktemplate` RPC are now
   deprecated and the new `sigchecks` and `sigchecklimit` fields should be used
   instead. The option `-deprecatedrpc=getblocktemplate_sigops` can be used to
   print the legacy fields.
