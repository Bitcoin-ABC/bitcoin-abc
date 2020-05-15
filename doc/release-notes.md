# Bitcoin ABC 0.24.1 Release Notes

Bitcoin ABC version 0.24.1 is now available from:

  <https://download.bitcoinabc.org/0.24.1/>

This release includes the following features and fixes:

## CLI

A new `bitcoin-cli -generate` command, equivalent to RPC `generatenewaddress`
followed by `generatetoaddress`, can generate blocks for command line testing
purposes. This is a client-side version of the former `generate` RPC. See
the help for details.

## Notification changes

`-walletnotify` notifications are now sent for wallet transactions that are
removed from the mempool because they conflict with a new block. These
notifications were sent previously before the v0.21.13 release, but had been
broken since that release.
