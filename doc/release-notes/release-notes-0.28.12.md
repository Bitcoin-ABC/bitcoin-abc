# Bitcoin ABC 0.28.12 Release Notes

Bitcoin ABC version 0.28.12 is now available from:

  <https://download.bitcoinabc.org/0.28.12/>

This release includes the following features and fixes:
 - It is possible to manually set several staking reward winners via the
   `setstakingreward` RPC by setting the optional `append` flag. The
   `getstakingreward` RPC now returns an array to reflect this change. The old
   behavior remains available via the `-deprecatedrpc=getsatkingreward` option.
   This change of behavior only affects the node's avalanche vote and has no
   effect on mining.
