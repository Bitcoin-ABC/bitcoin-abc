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

The `-chronikelectrumbind` option is used to bind the Electrum server to the target network `ip:port:protocol`, where protocol can be either:
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
Using the `-chronikelectrumbind` option with protocol `s` is considered experimental and unstable for now, so the recommended way is to run Chronik Electrum on a local plaintext port and use nginx as a TLS reverse proxy.


### Configure bitcoind for Chronik Electrum

Below is an example `bitcoin.conf` configuration file for the FQDN `electrum.example.com` using the port `50001` for plaintext TCP:

```
chronik=1
chronikelectrumbind=127.0.0.1:50001:t
chronikelectrumurl=electrum.example.com
```

### Get a certicate

Before setting up the reverse proxy, you need to get a certificate for your server FQDN; if your hosting provider doesn't provide one you can use [Let's Encrypt](https://letsencrypt.org/). You will need the full certificate chain in PEM format as well as the private key in PEM format.
When using Let's Encrypt these files are named `fullchain.pem` and `privkey.pem`.

### Install and configure nginx

For Debian/Ubuntu, you can run:

```
sudo apt update
sudo apt install nginx libnginx-mod-stream
```

Create the nginx configuration file `/etc/nginx/stream.d/chronik.conf`:

```
upstream chronik_backend {
    server 127.0.0.1:50001;
}

server {
    listen 50002 ssl;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    proxy_pass          chronik_backend;
}
```

And add this to your nginx configuration file `/etc/nginx/nginx.conf`:

```
stream {
    include /etc/nginx/stream.d/*.conf;
}
```

Then run the following commands to test the configuration and enable nginx:
```
# Test configuration
sudo nginx -t

# Enable and start the service
sudo systemctl enable nginx
sudo systemctl restart nginx
```

### Alternative without reverse proxy

Add this to your `bitcoin.conf` file to use the builtin TLS options (experimental):
```
chronik=1
chronikelectrumbind=0.0.0.0:50002:s
chronikelectrumurl=electrum.example.com
chronikelectrumcert=/path/to/fullchain.pem
chronikelectrumprivkey=/path/to/privkey.pem
```

The  `0.0.0.0` IP  binds to all the available network interfaces.

You can also repeat the `-chronikelectrumbind` option for binding to several interfaces. Use the options below to get both a convenient TCP access on localhost and a TLS access on all interfaces:

```
chronikelectrumbind=127.0.0.1:50001:t
chronikelectrumbind=0.0.0.0:50002:s
```

### Logging

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
