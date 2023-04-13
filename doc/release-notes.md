# Bitcoin ABC 0.33.10 Release Notes

Bitcoin ABC version 0.33.10 is now available from:

  <https://download.bitcoinabc.org/0.33.10/>

This release includes the following features and fixes:
- A new `importmempool` RPC has been added. It loads a valid `mempool.dat` file and attempts to
  add its contents to the mempool. This can be useful to import mempool data from another node
  without having to modify the datadir contents and without having to restart the node.
