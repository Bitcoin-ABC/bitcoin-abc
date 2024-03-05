![Chronik Logo](chroniklogo.png "Chronik")

(Logo design by Alita Yin [ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv](https://explorer.e.cash/address/ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv))

# Chronik
Chronik is a fast and reliable indexer built directly into the Bitcoin ABC node.

This README is about how to run a bitcoind instance with Chronik enabled.
- **If you want to know how to use `chronik-client` in your eCash apps**, go to [../modules/chronik-client/README.md].

## Getting started
To enable Chronik, simply pass `-chronik` as CLI argument:

```
./bitcoind -chronik
```

Alternatively, you can also set it in the bitcoin.conf file:

```
chronik=1
```

Note: If you have a previously synced but un-indexed node, this will first re-sync Chronik with the node, which could take quite some time. And when initially syncing a node from Genesis, Chronik will slow down initial sync by at least a factor of 2-3x, depending on hardware. It is highly recommended to use a server with a fast SSD.

We're continuously working on optimizing Chronik to bring down initial sync time.

### `-chronikbind`
On mainnet, by default, Chronik is bound to port 8331 on `127.0.0.1` (IPv4) and `::1` (IPv6). If you want to change this, use the `-chronikbind` argument, here e.g. binding it to port 10000 on IPv4:

```
./bitcoind -chronik -chronikbind=127.0.0.1:10000
```

You can specify `-chronikbind` multiple times to bind to multiple hosts, here e.g. binding to both IPv4 and IPv6 on port 10000:

```
./bitcoind -chronik -chronikbind=127.0.0.1:10000 -chronikbind=[::1]:10000
```

Note: Unlike the RPC interface, Chronik is designed to be openly available on the internet, so at this point in development, there's no username/password, no bearer token, cookie or whitelist available.

### `-chroniktokenindex=0`
By default, Chronik has SLP/ALP token indexing **enabled**. However, if you don't need token indexing, you can disable this by providing `-chroniktokenindex=0`.

**Warning**: If you previously had a token index, supplying `-chroniktokenindex=0` will immediately wipe the token index, and to get it back, you will have to run `-chronikreindex`, which can take a long time.

**Note**: Even if your app is XEC only, it is still highly recommended to have the token index enabled, as Chronik provides a lot of checks to prevent accidental token burning. Since many tokens used on eCash have actual value, this will avoid accidentally burning these tokens, e.g. when broadcasting txs, and it is recommended to ignore UTXOs with token values for XEC-only apps.

### `-chronikreindex`
Sometimes it is necessary to re-index only Chronik, e.g. if the database corrupted through an outage. Supply `-chronikreindex` to only reindex the Chronik database and to leave the node untouched.

Note: Since the official release of Chronik, database upgrades for newer versions will be done automatically at startup, so you probably won't have to use this option too often.

### `-chronikperfstats`
If you want to help Bitcoin ABC optimizing Chronik, you can provide this flag when resyncing the node. It collects some performance statistics in the `<datadir>/perf` folder, which will help us with development.

### Using a reverse proxy
Since Chronik uses WebSocket, and if you're using a reverse proxy like Nginx, you likely need to set a few Upgrade fields for the /ws endpoint.

#### Nginx
```
location /xec/ {
    proxy_pass http://127.0.0.1:8331/;
    proxy_set_header Host $http_host;
}

location /xec/ws {
    proxy_pass http://127.0.0.1:8331/ws;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}
```

## Legacy NNG Chronik
Before the integration of Chronik into the node, it was available as a standalone software that accessed the node via an NNG interface. Since the in-node Chronik is better in every regard to the NNG variant, the NNG variant is now deprecated. However, you can still find it here: https://github.com/raipay/chronik/

## Articles
- You can read about the reasoning behind this indexer in [this article by Mengerian](https://mengerian.medium.com/why-i-am-excited-about-the-ecash-chronik-project-1401b945eb21).

## Telegram
You can also join the Chronik Work Group on Telegram if you have issues, contact Tobias Ruck to add you.

## Known limitations

### On 32-bit systems
On 32-bit systems, once an address reaches 4294967295 transactions, the paginated `/address/...` or `/script/...` APIs will return empty pages for queries trying to fetch transactions beyond this limit.

At the time of writing (Apr 2023), the address with the most transactions is around 3000000, so we're far away from that limit.
