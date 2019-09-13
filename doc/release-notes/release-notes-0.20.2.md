Bitcoin ABC version 0.20.2 is now available from:

  <https://download.bitcoinabc.org/0.20.2/>

This release includes the following features and fixes:
 - Improved initial block download performance by ~20%.
 - Improved initial block download performance during pruning.
 - `bitcoin-qt -resetguisettings` now generates a backup of the former GUI settings.
 - Removed features that were deprecated in 0.19.x, including `signrawtransaction`,
   `fundrawtransaction -reserveChangeKey`, parts of `validateaddress`, use of
   addresses in `createmultisig`, and other miscellaneous behaviors.
 - Minor logging improvements.
 - Introduced `submitheader` RPC for submitting header candidates as chaintips.
