Bitcoin ABC version 0.20.9 is now available from:

  <https://download.bitcoinabc.org/0.20.9/>

This release includes the following features and fixes:
 - Fixed a bug with Multiwallets that have their own directories (i.e. cases
   such as `DATADIR/wallets/mywallet/wallet.dat`).  Backups of these wallets
   will now take each wallet's specific directory into account.
 - When transactions are rejected for being low fee, the error message will
   read "min relay fee not met" instead of "insufficient priority". Also,
   a bug was fixed where sometimes low fee transactions would be accepted via
   `sendrawtransaction` (and be stuck semipermanently, as they would be unable
   to relay to miners).
 - Added `nTx` return value to `getblock` and `getblockheader` detailing the
   number of transactions in the returned block.
