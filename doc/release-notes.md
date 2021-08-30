# Bitcoin ABC 0.32.12 Release Notes

Bitcoin ABC version 0.32.12 is now available from:

  <https://download.bitcoinabc.org/0.32.12/>

- If `-proxy=` is given together with `-noonion` then the provided proxy will
  not be set as a proxy for reaching the Tor network. So it will not be
  possible to open manual connections to the Tor network for example with the
  `addnode` RPC. To mimic the old behavior use `-proxy=` together with
  `-onlynet=` listing all relevant networks except `onion`.
