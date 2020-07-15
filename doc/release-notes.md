# Bitcoin ABC 0.22.11 Release Notes

Bitcoin ABC version 0.22.11 is now available from:

  <https://download.bitcoinabc.org/0.22.11/>

This release includes the following features and fixes:

- The `getpeerinfo` RPC no longer returns the `banscore` field unless the configuration
  option `-deprecatedrpc=banscore` is used. The `banscore` field will be fully
  removed in the next major release.

- The `-banscore` configuration option, which modified the default threshold for
  disconnecting and discouraging misbehaving peers, has been removed as part of
  changes in this release to the handling of misbehaving peers.

GUI changes
-----------

- The GUI Peers window no longer displays a "Ban Score" field.
