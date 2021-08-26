# Bitcoin ABC 0.24.1 Release Notes

Bitcoin ABC version 0.24.1 is now available from:

  <https://download.bitcoinabc.org/0.24.1/>

This release includes the following features and fixes:

## CLI

A new `bitcoin-cli -generate` command, equivalent to RPC `generatenewaddress`
followed by `generatetoaddress`, can generate blocks for command line testing
purposes. This is a client-side version of the former `generate` RPC. See
the help for details.
