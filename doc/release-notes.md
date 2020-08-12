# Bitcoin ABC 0.24.5 Release Notes

Bitcoin ABC version 0.24.5 is now available from:

  <https://download.bitcoinabc.org/0.24.5/>

This release includes the following features and fixes:

- The `getpeerinfo` RPC now returns a `connection_type` field. This indicates
  the type of connection established with the peer. It will return one of six
  options. For more information, see the `getpeerinfo` help documentation.
- The `getpeerinfo` RPC no longer returns the `addnode` field by default. This
  field will be fully removed in a future release.  It can be accessed
  with the configuration option `-deprecatedrpc=getpeerinfo_addnode`. However,
  it is recommended to instead use the `connection_type` field (it will return
  `manual` when addnode is true).
