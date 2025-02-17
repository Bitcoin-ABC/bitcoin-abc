# Bitcoin ABC 0.30.11 Release Notes

Bitcoin ABC version 0.30.11 is now available from:

  <https://download.bitcoinabc.org/0.30.11/>

This release includes the following features and fixes:
 - A new init option `simplegbt` can be enabled to change the output of the
 `getblocktemplate` call to return the miner fund and staking reward data in a
 simplified output format. Please refer to the `getblocktemplate` documentation
 for more details. This option is disabled by default so there is no change in
 behavior unless it's explicitly opted in.
