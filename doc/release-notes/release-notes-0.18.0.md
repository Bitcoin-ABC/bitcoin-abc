Bitcoin ABC version 0.18.0 is now available from:

  <https://download.bitcoinabc.org/0.18.0/>

This release includes the following features and fixes:
 - Remove the bip9params configuration.
 - Remove the bip9_softforks result from the getblockchaininfo RPC call.
 - Remove the rules, vbavailable and vbrequired result from the
   getblocktemplate RPC call.
 - Remove the rules argument from the getblocktemplate RPC call.
 - Log difference between block header time and received time when competing
   blocks are received for the same chain height.
 - Bump automatic replay protection to May 2019 upgrade.
 - Remove topological ordering constraint from blocks starting Nov, 15 2018.
 - Implement canonical transaction order, enforced Nov, 15 2018.
 - Add OP_CHECKDATASIG and OP_CHECKDATASIGVERIFY, activates Nov, 15 2018.
 - Enforce minimum transaction size of 100 bytes, starting Nov, 15 2018.
 - Enforce PUSH ONLY rule for scriptSig, starting Nov, 15 2018.
 - Enforce CLEANSTACK rule, starting Nov 15, 2018.

