# Bitcoin ABC 0.30.12 Release Notes

Bitcoin ABC version 0.30.12 is now available from:

  <https://download.bitcoinabc.org/0.30.12/>

This release includes the following features and fixes:
 - The `availability_score` field from the `getavalanchepeerinfo` RPC is
   deprecated and no longer computed. It will be removed in a future release.
   This field was never used outside of this RPC. To keep the field in the RPC
   output, add `deprecatedrpc=peer_availability_score` to your node
   configuration. Note that the value will always be 0.
 - The `availability_score` field from the `getpeerinfo` RPC is deprecated and
   will be removed in a future release. To keep the field in the RPC output, add
   `deprecatedrpc=node_availability_score` to your node configuration.
