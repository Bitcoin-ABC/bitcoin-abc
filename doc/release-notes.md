Bitcoin ABC version 0.21.0 is now available from:

  <https://download.bitcoinabc.org/0.21.0/>

This release includes the following features and fixes:
  - The RPC `getrpcinfo` returns runtime details of the RPC server. At the moment
    it returns the active commands and the corresponding execution time.
  - `ischange` field of boolean type that shows if an address was used for change
    output was added to `getaddressinfo` method response.
  - Bump automatic replay protection to Nov 2020 upgrade.
  - Re-introduction of BIP9, info available from the `getblockchaininfo` RPC.
  - Miner infrastructure funding plan available via BIP9.
  - Various bug fixes and stability improvements.

New RPC methods
---------------
  - `getnodeaddresses` returns peer addresses known to this node. It may be used to connect to nodes over TCP without using the DNS seeds.

Network upgrade
---------------
At the MTP time of 1589544000 (May 15, 2020 12:00:00 UTC) the following behaviors will change:
  - The default for max number of in-pool ancestors (`-limitancestorcount`) is changed from 25 to 50.
  - The default for max number of in-pool descendants (`-limitdescendantcount`) is changed from 25 to 50.
  - OP_REVERSEBYTES support in script.
  - New SigOps counting method (SigChecks) as standardness and consensus rules.
