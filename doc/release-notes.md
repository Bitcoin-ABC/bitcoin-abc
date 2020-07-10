# Bitcoin ABC 0.22.11 Release Notes

Bitcoin ABC version 0.22.11 is now available from:

  <https://download.bitcoinabc.org/0.22.11/>

This release includes the following features and fixes:

- `getpeerinfo` no longer returns the `banscore` field unless the configuration
  option `-deprecatedrpc=banscore` is used. The `banscore` field will be fully
  removed in the next major release.
