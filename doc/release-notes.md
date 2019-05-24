Bitcoin ABC version 0.19.7 is now available from:

  <https://download.bitcoinabc.org/0.19.7/>

This release includes the following features and fixes:
 - `-includeconf=<file>` can be used to include additional configuration files.
  Only works inside the `bitcoin.conf` file, not inside included files or from
  command-line. Multiple files may be included. Can be disabled from command-
  line via `-noincludeconf`. Note that multi-argument commands like
  `-includeconf` will override preceding `-noincludeconf`, i.e.
    noincludeconf=1
    includeconf=relative.conf
  as bitcoin.conf will still include `relative.conf`.
 - The `createrawtransaction` RPC will now accept an array or dictionary (kept for compatibility) for the `outputs` parameter. This means the order of transaction outputs can be specified by the client.
 - The new RPC `testmempoolaccept` can be used to test acceptance of a transaction to the mempool without adding it.
 - An `initialblockdownload` boolean has been added to the `getblockchaininfo` RPC to indicate whether the node is currently in IBD or not.
