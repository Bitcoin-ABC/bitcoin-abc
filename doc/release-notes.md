# Bitcoin ABC 0.32.12 Release Notes

Bitcoin ABC version 0.32.12 is now available from:

  <https://download.bitcoinabc.org/0.32.12/>

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
