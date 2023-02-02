# Bitcoin ABC 0.27.0 Release Notes

Bitcoin ABC version 0.27.0 is now available from:

  <https://download.bitcoinabc.org/0.27.0/>

  - The `softforks` field from the `getblockchaininfo` RPC is deprecated.
    To keep using this field, use the `-deprecatedrpc=softforks` option.
    Note that this field has been empty for a long time and will remain
    empty until its eventual removal.
