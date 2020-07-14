Bitcoin ABC version 0.21.11 is now available from:

  <https://download.bitcoinabc.org/0.21.11/>

This release includes the following features and fixes:
 - Upgrade minimum supported boost version to 1.59

Deprecated or removed RPCs
--------------------------
- The wallet's `generate` RPC method was deprecated in v0.21.5 and has now
  been fully removed.  This RPC is only used for
  testing, but its implementation reached across multiple subsystems
  (wallet and mining), so it has been removed to simplify the
  wallet-node interface.  Projects that are using `generate` for testing
  purposes should transition to using the `generatetoaddress` RPC, which
  does not require or use the wallet component. Calling
  `generatetoaddress` with an address returned by the `getnewaddress`
  RPC gives the same functionality as the old `generate` RPC.
