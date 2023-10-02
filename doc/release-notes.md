# Bitcoin ABC 0.27.15 Release Notes

Bitcoin ABC version 0.27.15 is now available from:

  <https://download.bitcoinabc.org/0.27.15/>

This release includes the following features and fixes:
 - The `getavalancheinfo` RPC has an improved `local.verification_status` field
   that better explains why a proof is not verified. As a consequence the
   `local.sharing` field is no longer needed and has been deprecated. You can
   set the `-deprecatedrpc=getavalancheinfo_sharing` option to keep using it.
 - The `net` logging category has been split in 2 categories to reduce verbosity
   when logging the `net` messages. To get the same log as previous versions,
   please use both `-debug=net` and `-debug=netdebug`.
