# Bitcoin ABC 0.26.3 Release Notes

Bitcoin ABC version 0.26.3 is now available from:

  <https://download.bitcoinabc.org/0.26.3/>

This release includes the following features and fixes:
 - A new `total_fee` field showing the total fees for all transactions in the
   mempool has been added to the `getmempoolinfo` RPC.
 - Added a new `getavalancheproofs` RPC to retrieve all avalanche proof IDs
   tracked by the node.
 - Added a new field `immature_stake_amount` to `getavalancheinfo` to report
   the total amount of stake that will mature within the next 2016 blocks.
