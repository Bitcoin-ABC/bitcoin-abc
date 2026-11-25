# Bitcoin ABC 0.34.5 Release Notes

Bitcoin ABC version 0.34.5 is now available from:

  <https://download.bitcoinabc.org/0.34.5/>

This release includes the following features and fixes:
 - The default value for the `-peerbloomfilters` configuration option (and, thus,
   NODE_BLOOM support) has been changed to false.
   Clients which rely on the availability of NODE_BLOOM-supporting nodes on the
   P2P network should consider the process of migrating to a more modern
   alternative like Chronik or run their own node with the feature enabled.
