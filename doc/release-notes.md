# Bitcoin ABC 0.22.5 Release Notes

Bitcoin ABC version 0.22.5 is now available from:

  <https://download.bitcoinabc.org/0.22.5/>

This release includes the following features and fixes:
- The `-upgradewallet` command line flag has been replaced in favor of the `upgradewallet` RPC.

Updated RPCs
------------

- The `getchaintxstats` RPC now returns the additional key of
  `window_final_block_height`.
