# Bitcoin ABC 0.25.1 Release Notes

Bitcoin ABC version 0.25.1 is now available from:

  <https://download.bitcoinabc.org/0.25.1/>

This release includes the following features and fixes:
- The `getnodeaddresses` RPC now returns a "network" field indicating the
  network type (ipv4, ipv6, onion, or i2p) for each address.
- The `getnodeaddresses` RPC now also accepts a "network" argument (ipv4, ipv6,
  onion, or i2p) to return only addresses of the specified network.
