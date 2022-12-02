# Bitcoin ABC 0.29.6 Release Notes

Bitcoin ABC version 0.29.6 is now available from:

  <https://download.bitcoinabc.org/0.29.6/>

This release includes the following features and fixes:

JSON-RPC
---

All JSON-RPC methods accept a new [named
parameter](JSON-RPC-interface.md#parameter-passing) called `args` that can
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

The JSON-RPC server now rejects requests where a parameter is specified
multiple times with the same name, instead of silently overwriting earlier
parameter values with later ones.
