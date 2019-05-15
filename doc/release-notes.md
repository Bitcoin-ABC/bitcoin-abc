Bitcoin ABC version 0.21.12 is now available from:

  <https://download.bitcoinabc.org/0.21.12/>

This release includes the following features and fixes:

RPC changes
-----------
The RPC `getwalletinfo` response now includes the `scanning` key with an object
if there is a scanning in progress or `false` otherwise. Currently the object
has the scanning duration and progress.

Wallet
------

- When in pruned mode, a rescan that was triggered by an `importwallet`,
  `importpubkey`, `importaddress`, or `importprivkey` RPC will only fail when
  blocks have been pruned. Previously it would fail when `-prune` has been set.
  This change allows to set `-prune` to a high value (e.g. the disk size) and
  the calls to any of the import RPCs would fail when the first block is
  pruned.
