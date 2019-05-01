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

The `createwallet`, `loadwallet`, and `unloadwallet` RPCs now accept
`load_on_startup` options that modify bitcoin's dynamic configuration in
`\<datadir\>/settings.json`, and can add or remove a wallet from the list of
wallets automatically loaded at startup. Unless these options are explicitly
set to true or false, the load on startup wallet list is not modified, so this
change is backwards compatible.

In the future, the GUI will start updating the same startup wallet list as the
RPCs to automatically reopen wallets previously opened in the GUI.

RPCs
----

- `getnetworkinfo` now returns two new fields, `connections_in` and
  `connections_out`, that provide the number of inbound and outbound peer
  connections. These new fields are in addition to the existing `connections`
  field, which returns the total number of peer connections.
- The `connections` field of `bitcoin-cli -getinfo` is expanded to return a JSON
  object with `in`, `out` and `total` numbers of peer connections. It previously
  returned a single integer value for the total number of peer connections.
