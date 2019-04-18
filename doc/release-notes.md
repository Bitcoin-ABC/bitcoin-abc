Bitcoin ABC version 0.19.4 is now available from:

  <https://download.bitcoinabc.org/0.19.4/>

This release includes the following features and fixes:
 - Added to `getblockchaininfo` `size_on_disk` and, when the prune option is 
   enabled, `prune_height`, `automatic_pruning`, and `prune_target_size`.
    - The help message also reflects this.
 - Code standard updated to c++14.
 - Remove `depends` from transaction objects provided by `getblocktemplate`.
 - The option to reuse exisiting receiving addresses has been removed from the wallet.
 - Remove safe mode.
 - Added Schnorr signing to JNI (Java Native Interface) bindings.
 - Added `-getinfo` option to bitcoin-cli for batching calls to `getnetworkinfo`, `getblockchaininfo`, and `getwalletinfo`.
   This option is only available for bitcoin-cli.
