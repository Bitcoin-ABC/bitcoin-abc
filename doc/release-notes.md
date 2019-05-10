Bitcoin ABC version 0.19.6 is now available from:

  <https://download.bitcoinabc.org/0.19.6/>

This release includes the following features and fixes:
 - Using addresses in createmultisig is now deprectated. Use `-deprecatedrpc=createmultisig` to get the old behavior.
 - Added `savemempool` RPC command for dumping mempool to disk.
 - Added `-blocksdir` command line option for saving block data to a different disk location (such as a higher-capacity HDD).
