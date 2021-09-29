# Bitcoin ABC 0.24.3 Release Notes

Bitcoin ABC version 0.24.3 is now available from:

  <https://download.bitcoinabc.org/0.24.3/>

This release includes the following features and fixes:

Wallet
------

- The `-zapwallettxes` startup option has been removed and its functionality removed
  from the wallet. This functionality has been superseded with the abandon transaction
  feature.

Configuration
-------------

Wallets created or loaded in the GUI will now be automatically loaded on
startup, so they don't need to be manually reloaded next time Bitcoin is
started. The list of wallets to load on startup is stored in
`\<datadir\>/settings.json` and augments any command line or `bitcoin.conf`
`-wallet=` settings that specify more wallets to load. Wallets that are
unloaded in the GUI get removed from the settings list so they won't load again
automatically next startup.

The `createwallet`, `loadwallet`, and `unloadwallet` RPCs now accept
`load_on_startup` options to modify the settings list. Unless these options are
explicitly set to true or false, the list is not modified, so the RPC methods
remain backwards compatible.

RPCs
----

- `getnetworkinfo` now returns two new fields, `connections_in` and
  `connections_out`, that provide the number of inbound and outbound peer
  connections. These new fields are in addition to the existing `connections`
  field, which returns the total number of peer connections.
- The `connections` field of `bitcoin-cli -getinfo` is expanded to return a JSON
  object with `in`, `out` and `total` numbers of peer connections. It previously
  returned a single integer value for the total number of peer connections.
