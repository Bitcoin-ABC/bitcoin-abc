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
 - The '-usehd' option has been removed. It is no longer possible to create a non HD wallet.

External wallet files
---------------------

The `-wallet=<path>` option now accepts full paths instead of requiring wallets
to be located in the -walletdir directory.

Newly created wallet format
---------------------------

If `-wallet=<path>` is specified with a path that does not exist, it will now
create a wallet directory at the specified location (containing a wallet.dat
data file, a db.log file, and database/log.?????????? files) instead of just
creating a data file at the path and storing log files in the parent
directory. This should make backing up wallets more straightforward than
before because the specified wallet path can just be directly archived
without having to look in the parent directory for transaction log files.

For backwards compatibility, wallet paths that are names of existing data
files in the `-walletdir` directory will continue to be accepted and
interpreted the same as before.

Low-level RPC changes
---------------------

 - When bitcoind is not started with any `-wallet=<path>` options, the name of
   the default wallet returned by `getwalletinfo` and `listwallets` RPCs is now
   the empty string `""` instead of `"wallet.dat"`. If bitcoind is started with
   any `-wallet=<path>` options, there is no change in behavior, and the name of
   any wallet is just its `<path>` string.

Transaction index changes
-------------------------

The transaction index is now built separately from the main node procedure,
meaning the `-txindex` flag can be toggled without a full reindex. If bitcoind
is run with `-txindex` on a node that is already partially or fully synced
without one, the transaction index will be built in the background and become
available once caught up. When switching from running `-txindex` to running
without the flag, the transaction index database will *not* be deleted
automatically, meaning it could be turned back on at a later time without a full
resync.
