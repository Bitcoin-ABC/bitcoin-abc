# Bitcoin ABC 0.22.4 Release Notes

Bitcoin ABC version 0.22.4 is now available from:

  <https://download.bitcoinabc.org/0.22.4/>

This release includes the following features and fixes:
- Various logging fixes and improvements.

Wallet
------
- The way that output trust was computed has been fixed, which impacts
  confirmed/unconfirmed balance status and coin selection.

Command-line options
--------------------
- The `-debug=db` logging category has been renamed to `-debug=walletdb`,
  to distinguish it from `coindb`. `-debug=db` has been deprecated and will
  be removed in a next release.

Low-level RPC Changes
---------------------
- The RPC gettransaction, listtransactions and listsinceblock responses now also
  includes the height of the block that contains the wallet transaction, if any.

- A new descriptor type `sortedmulti(...)` has been added to support multisig scripts
  where the public keys are sorted lexicographically in the resulting script.

Deprecated or removed RPCs
--------------------------
- The `getaddressinfo` RPC `labels` field now returns an array of label name
  strings. Previously, it returned an array of JSON objects containing `name` and
  `purpose` key/value pairs, which is now deprecated and will be removed in a future
  release. To re-enable the previous behavior, launch bitcoind with
  `-deprecatedrpc=labelspurpose`.

Miscellaneous CLI Changes
-------------------------
- The `testnet` field in `bitcoin-cli -getinfo` has been renamed to `chain` and
  now returns the current network name as defined in BIP70 (main, test, regtest).

Gitian Builds
-------------
- By default, `gitian-builder` cleans up the build container after building.
