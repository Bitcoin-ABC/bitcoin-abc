# Bitcoin ABC 0.33.0 Release Notes

Bitcoin ABC version 0.33.0 is now available from:

  <https://download.bitcoinabc.org/0.33.0/>

This release includes the following features and fixes:
 - If `-proxy=` is given together with `-noonion` then the provided proxy will
   not be set as a proxy for reaching the Tor network. So it will not be
   possible to open manual connections to the Tor network for example with the
   `addnode` RPC. To mimic the old behavior use `-proxy=` together with
   `-onlynet=` listing all relevant networks except `onion`.
 - With I2P connections, a new, transient address is used for each outbound
   connection if `-i2pacceptincoming=0`.
 - Ports specified in `-port` and `-rpcport` options are now validated at
   startup. Values that previously worked and were considered valid can now
   result in errors.
 - UNIX domain sockets can now be used for proxy connections. Set `-onion` or `-proxy`
   to the local socket path with the prefix `unix:` (e.g. `-onion=unix:/home/me/torsocket`).
 - Passing an invalid `-rpcauth` argument now cause bitcoind to fail to start.
 - The thoughput of Avalanche Pre-Consensus has been increased by voting on more
   items in a single message. A new option `-avamaxelementpoll` allows the node
   operator to further tune this value if desired.
 - The default block size for mining has been increased to 16MB. The previous
   default value was very conservative and this is no longer relevant since
   Avalanche Pre-Consensus made block generation much faster. The value can
   still be tuned with the `-blockmaxsize` if desired.

At the MTP time of `1778846400` (May 15, 2026 12:00:00 UTC), the following
changes will be activated:
 - Bump automatic replay protection to the next upgrade, timestamp `1794744000`
   (November 15, 2026 12:00:00 UTC).
