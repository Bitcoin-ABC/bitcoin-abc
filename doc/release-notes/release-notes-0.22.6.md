# Bitcoin ABC 0.22.6 Release Notes

Bitcoin ABC version 0.22.6 is now available from:

  <https://download.bitcoinabc.org/0.22.6/>

This release includes the following features and fixes:

P2P and network changes
-----------------------

#### Removal of reject network messages from Bitcoin ABC (BIP61)

This is a follow-up on the removal of BIP61 REJECT message support in
Bitcoin ABC version 0.22.5:

* Log messages that previously reported the REJECT code when a transaction was
  not accepted to the mempool now no longer report the REJECT code. The verbal
  reason for rejection is still reported.

Updated RPCs
------------

- `walletprocesspsbt` and `walletcreatefundedpsbt` now include BIP 32
  derivation paths by default for public keys if we know them. This can be
  disabled by setting `bip32derivs` to `false`.

New settings
------------

- A new `-asmap` configuration option has been added to enable IP-to-ASN mapping
  for bucketing of the network peers to diversify the network connections. The
  legacy /16 prefix mapping remains the default. See `bitcoind help` for more
  information. This option is experimental and subject to changes or removal in
  future releases.

- Importing blocks upon startup via the `bootstrap.dat` file no longer occurs
  by default. The file must now be specified with `-loadblock=<file>`.

Utilities
---------

- The `bitcoin-cli` utility used with the `-getinfo` parameter now returns a
  `headers` field with the number of downloaded block headers on the best
  headers chain (similar to the `blocks` field that is also returned) and a
  `verificationprogress` field that estimates how much of the best block chain
  has been synced by the local node. The information returned no longer
  includes the `protocolversion`, `walletversion`, and `keypoololdest` fields.

Build system changes
--------------------

The minimum supported miniUPnPc version is set to 1.9 (API version 10).

GUI changes
-----------

- The "Start Bitcoin Core on system login" option has been removed on macOS.
