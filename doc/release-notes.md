# Bitcoin ABC 0.29.7 Release Notes

Bitcoin ABC version 0.29.7 is now available from:

  <https://download.bitcoinabc.org/0.29.7/>

This release includes the following features and fixes:
 - The `-deprecatedrpc=getstakingreward` option was under deprecation for
   several months and has been removed completely.
 - The `getstakingreward` RPC now returns the `proofid` of the staking reward
   winner in addition to the payout script.
 - A new `setflakyproof` RPC instructs the node to also accept an alternative
   staking reward winner when the flaky proof would have been selected.
