# Bitcoin ABC 0.27.0 Release Notes

Bitcoin ABC version 0.27.0 is now available from:

  <https://download.bitcoinabc.org/0.27.0/>

This release includes the following features and fixes:
  - The `softforks` field from the `getblockchaininfo` RPC is deprecated.
    To keep using this field, use the `-deprecatedrpc=softforks` option.
    Note that this field has been empty for a long time and will remain
    empty until its eventual removal.
  - The `ancestorcount`, `ancestorsize` and `ancestorcount` fields from the
    `listunspent` RPC have been deprecated and will be removed in a future
    version. To keep using these fields, use the
    `-deprecatedrpc=mempool_ancestors_descendants` option.
