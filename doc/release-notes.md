# Bitcoin ABC 0.24.4 Release Notes

Bitcoin ABC version 0.24.4 is now available from:

  <https://download.bitcoinabc.org/0.24.4/>

This release includes the following features and fixes:

- Bitcoin ABC will no longer create an unnamed `""` wallet by default when no wallet is
  specified on the command line or in the configuration files. For backwards compatibility,
  if an unnamed `""` wallet already exists and would have been loaded previously, then it
  will still be loaded. Users without an unnamed `""` wallet and without any other wallets
  to be loaded on startup  will be prompted to either choose a wallet to load, or to
  create a new wallet.
- A new `send` RPC with similar syntax to `walletcreatefundedpsbt`, including
  support for coin selection and a custom fee rate. Using the new `send` method
  is encouraged: `sendmany` and `sendtoaddress` may be deprecated in a future release.
- The `testmempoolaccept` RPC returns `size` and a `fee` object with the `base` fee
  if the transaction passes validation.
- A "sequence" notifier is added to ZeroMQ notifications, enabling client-side mempool
  tracking.
- The same ZeroMQ notification (e.g. `-zmqpubhashtx=address`) can now be specified multiple
  times to publish the same notification to different ZeroMQ sockets.
- The `-startupnotify` option can be used to specify a command to execute when Bitcoin ABC
  has finished with its startup sequence.
