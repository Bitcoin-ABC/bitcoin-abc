# Bitcoin ABC 0.24.1 Release Notes

Bitcoin ABC version 0.24.1 is now available from:

  <https://download.bitcoinabc.org/0.24.1/>

This release includes the following features and fixes:

## CLI

A new `bitcoin-cli -generate` command, equivalent to RPC `generatenewaddress`
followed by `generatetoaddress`, can generate blocks for command line testing
purposes. This is a client-side version of the former `generate` RPC. See
the help for details.

## Low-level RPC Changes

- To make RPC `sendtoaddress` more consistent with `sendmany` the following error
    `sendtoaddress` codes were changed from `-4` to `-6`:
  - Insufficient funds
  - Transaction has too long of a mempool chain

- Exposed transaction version numbers are now treated as unsigned 32-bit integers
  instead of signed 32-bit integers. This matches their treatment in consensus
  logic. Versions greater than 2 continue to be non-standard (matching previous
  behavior of smaller than 1 or greater than 2 being non-standard). Note that
  this includes the joinpsbt command, which combines partially-signed
  transactions by selecting the highest version number.

## Notification changes

`-walletnotify` notifications are now sent for wallet transactions that are
removed from the mempool because they conflict with a new block. These
notifications were sent previously before the v0.21.13 release, but had been
broken since that release.
