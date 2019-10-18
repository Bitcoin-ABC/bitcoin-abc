# Bitcoin ABC 0.26.3 Release Notes

Bitcoin ABC version 0.26.3 is now available from:

  <https://download.bitcoinabc.org/0.26.3/>

This release includes the following features and fixes:

RPC changes
-----------

 - A new `total_fee` field showing the total fees for all transactions in the
   mempool has been added to the `getmempoolinfo` RPC.
 - Added a new `getavalancheproofs` RPC to retrieve all avalanche proof IDs
   tracked by the node.
 - Added a new field `immature_stake_amount` to `getavalancheinfo` to report
   the total amount of stake that will mature within the next 2016 blocks.
 - The `testmempoolaccept` RPC now accepts multiple transactions (still experimental at the moment,
   API may be unstable). This is intended for testing transaction packages with dependency
   relationships; it is not recommended for batch-validating independent transactions. In addition to
   mempool policy, package policies apply: the list cannot contain more than 50 transactions or have a
   total size exceeding 101K bytes, and cannot conflict with (spend the same inputs as) each other or
   the mempool.
 - `listunspent` now includes `ancestorcount`, `ancestorsize`, and
   `ancestorfees` for each transaction output that is still in the mempool.

P2P and network changes
-----------------------

 - Added NAT-PMP port mapping support via [`libnatpmp`](https://miniupnp.tuxfamily.org/libnatpmp.html).
   Use the `-natpmp` command line option to use NAT-PMP to map the listening port. If both UPnP
   and NAT-PMP are enabled, a successful allocation from UPnP prevails over one from NAT-PMP.
