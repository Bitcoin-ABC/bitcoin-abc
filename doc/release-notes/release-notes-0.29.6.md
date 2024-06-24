# Bitcoin ABC 0.29.6 Release Notes

Bitcoin ABC version 0.29.6 is now available from:

  <https://download.bitcoinabc.org/0.29.6/>

This release includes the following features and fixes:

JSON-RPC
---

All JSON-RPC methods accept a new named parameter called `args` that can
contain positional parameter values. This is a convenience to allow some
parameter values to be passed by name without having to name every value. The
python test framework and `bitcoin-cli` tool both take advantage of this, so
for example:

```sh
bitcoin-cli -named createwallet wallet_name=mywallet load_on_startup=1
```

Can now be shortened to:

```sh
bitcoin-cli -named createwallet mywallet load_on_startup=1
```

For RPC methods which accept `options` parameters (`importmulti`, `listunspent`, `fundrawtransaction`, `send`, `walletcreatefundedpsbt`), it is now possible to pass the options as named parameters without the need for a nested object.

This means it is possible make calls like:

```sh
src/bitcoin-cli -named fundrawtransaction <raw tx hex> txid fee_rate=100
```

instead of

```sh
src/bitcoin-cli -named fundrawtransaction <raw tx hex> options='{"fee_rate": 100}'
```

The JSON-RPC server now rejects requests where a parameter is specified
multiple times with the same name, instead of silently overwriting earlier
parameter values with later ones.
