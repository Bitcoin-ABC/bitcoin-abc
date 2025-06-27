# Chronik Electrum interface

Starting with version 0.31.8, Chronik is fully compatible with the ElectrumX protocol up to version 1.4.1 and the Electrum Cash protocol up to version 1.4.5 over TCP, TLS, WS and WSS.
Most changes from later Electrum Cash versions are also supported with the exception of the features that are not available to eCash.

This makes it easy for existing software relying on other Electrum server implementations such as Fulcrum to migrate to eCash and Chronik.

The ElectrumX protocol reference documentation is available here:
https://electrumx.readthedocs.io/en/latest/protocol.html

The Electrum Cash protocol reference documentation is available here:
https://electrum-cash-protocol.readthedocs.io/en/latest/

## Getting started

In order to use the Chronik Electrum interface, Chronik must be enabled.

A minimum command line is:

```bash
bitcoind -chronik -chronikelectrumbind=127.0.0.1:50001:t
```

The `-chronikelectrumbind` is used to bind the Electrum server to the target network `ip:port:protocol`, where protocol can be either:
 - `t` for TCP
 - `s` for TLS (formerly refered to as SSL in the protocol documentation)
 - `w` for WS
 - `y` for WSS.

The above example will then start an Electrum server reachable via the localhost interface
using jsonrpc commands over TCP on port 50001.

For testing purpose the server can be queried via `netcat` and the response formatted via `jq`. On the same machine:

```bash
echo '{"jsonrpc": "2.0", "method": "server.version", "params": [], "id": 0}' | nc 127.0.0.1 50001 | jq
```

## Exposing the server via TLS/WSS

It is recommended to prefer the TLS transport over TCP when exposing the server to the internet (the same applies for WSS vs WS).

First you need to get a certificate for your server FQDN; if your hosting provider doesn't provide one you can use [Let's Encrypt](https://letsencrypt.org/). You will need the full certificate chain in PEM format as well as the private key in PEM format.
When using Let's Encrypt these files are named `fullchain.pem` and `privkey.pem`.

Then you can bind to all the available network interfaces using `0.0.0.0` as an IP. Below is an example `bitcoin.conf` configuration file for the FQDN `electrum.example.com` using the port `50002` (the de-facto standard for Electrum over TLS):

```
chronik=1
chronikelectrumbind=0.0.0.0:50002:s
chronikelectrumurl=electrum.example.com
chronikelectrumcert=/path/to/fullchain.pem
chronikelectrumprivkey=/path/to/privkey.pem
```

You can also repeat the `-chronikelectrumbind` option for binding to several interfaces. Use the options below to get both a convenient TCP access on localhost and a TLS access on all interfaces:

```
chronikelectrumbind=127.0.0.1:50001:t
chronikelectrumbind=0.0.0.0:50002:s
```

You might also want to enable logging for the Chronik messages for easier debugging:

```
debug=chronik
```

## Performance

The Electrum protocol is not designed for performance. As a result it is much less efficient than using the Chronik API directly. In order to get the better performances, it is recommended to:
 - Disable all the chronik features that are not needed, especially the plugin feature (disabled by default).
   The eToken indexing can also be disabled if not needed by adding `chroniktokenindex=0` to the `bitcoin.conf` configuration file.
 - Limit the maximum transaction history your server will accept to serve. This is achieved by lowering the `chronikelectrummaxhistory` value in your `bitcoin.conf` configuration file (default is 200000 transactions).
 - Use a properly sized server, with emphasis on fast SSD then CPU.

## Other options

An Electrum server will return a donation address via the `server.donation_address` endpoint. You can set the donation address to your eCash wallet address via the `chronikelectrumdonationaddress` option in your `bitcoin.conf` configuration file.

The Electrum protocol includes a peer discovery mechanism in order to share other servers addresses. Chronik will run a periodic sanity check of all the registered peers to avoid sharing disconnected or misconfigured peers. This sanity check interval defaults to 10 minutes and can be overridden via the `chronikelectrumpeersvalidationinterval` option in your `bitcoin.conf` configuration file. Set the value to the desired interval in seconds, or to `0` to disable the feature entirely.

## Limitations

 - Only eCash addresses (with or without a prefix) are supported by the `blockchain.address.*` endpoints.
 - The `-chronikelectrumurl` option can only be set once, so a single FQDN is supported by the server.
 - The `blockchain.transaction.get` endpoint does not return all the verbose fields that are returned by the node `getrawtransaction` RPC.
   However most of them are present.
 - The `daemon.passthrough` endpoint is not available (added in the Electrum Cash protocol version 1.5.2).
   This is a security hazard by design, and since the node and the indexer are the same binary it makes no sense to expose such a feature.

## Telegram

You can join the [eCash Node Support Telegram group](https://t.me/eCashNode) if you have questions or need help.
