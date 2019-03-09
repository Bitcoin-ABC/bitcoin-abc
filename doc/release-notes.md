# Bitcoin ABC 0.22.4 Release Notes

Bitcoin ABC version 0.22.4 is now available from:

  <https://download.bitcoinabc.org/0.22.4/>

This release includes the following features and fixes:

Miscellaneous CLI Changes
-------------------------
- The `testnet` field in `bitcoin-cli -getinfo` has been renamed to `chain` and
 now returns the current network name as defined in BIP70 (main, test, regtest).
