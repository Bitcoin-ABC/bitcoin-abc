Bitcoin ABC version 0.18.5 is now available from:

  <https://download.bitcoinabc.org/0.18.5/>

This release includes the following features and fixes:
 - Add the finalized block concept. Finalized blocks cannot be reorged, which protects the network against deep reorgs.
 - Add the `-maxreorgdepth` configuration to configure at what depth block are considered final. Default is 10. Use -1 to disable.
 - Introduce `finalizeblock` RPC to finalize a block at the will of the node operator.
 - Introduce a penalty to alternative chains based on the depth of the fork. This makes it harder for an attacker to do mid size reorg.
