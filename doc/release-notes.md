Bitcoin ABC version 0.21.12 is now available from:

  <https://download.bitcoinabc.org/0.21.12/>

This release includes the following features and fixes:

RPC changes
-----------
The RPC `getwalletinfo` response now includes the `scanning` key with an object
if there is a scanning in progress or `false` otherwise. Currently the object
has the scanning duration and progress.
