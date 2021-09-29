# Bitcoin ABC 0.22.13 Release Notes

Bitcoin ABC version 0.22.13 is now available from:

  <https://download.bitcoinabc.org/0.22.13/>

This release includes the following features and fixes:
 - Netmasks that contain 1-bits after 0-bits (the 1-bits are not contiguous on
   the left side, e.g. 255.0.255.255) are no longer accepted. They are invalid
   according to RFC 4632. Netmasks are used in the `-rpcallowip` and `-whitelist`
   configuration options and in the `setban` RPC.
