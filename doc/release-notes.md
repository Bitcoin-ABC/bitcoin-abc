# Bitcoin ABC 0.33.1 Release Notes

Bitcoin ABC version 0.33.1 is now available from:

  <https://download.bitcoinabc.org/0.33.1/>

This release includes the following features and fixes:
- Support for UPnP was dropped. If you want to open a port automatically, consider using
  the `-natpmp` option instead, which uses PCP or NAT-PMP depending on router support.
  Setting `-upnp` will now return an error.
