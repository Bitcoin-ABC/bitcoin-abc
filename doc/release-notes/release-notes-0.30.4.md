# Bitcoin ABC 0.30.4 Release Notes

Bitcoin ABC version 0.30.4 is now available from:

  <https://download.bitcoinabc.org/0.30.4/>

This release includes the following features and fixes:
 - The `address_type` field of the `getnewaddress` RPC is deprecated and will be
   removed in the future. This field is actually confusing as it's not setting
   the returned address type and is only there for compatibility reason. The
   documentation has been updated to clarify this behavior.
 - This release contains a fix for a bug that could cause a node to delay the
   download of the latest block under certain circumstances.
