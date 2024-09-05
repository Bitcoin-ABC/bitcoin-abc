---
sidebar_position: 2
---

# Setup Chronik

After downloading Chronik, you need to run it to setup an instance.

:::warning
This tutorial is about how to run a bitcoind instance with Chronik enabled.
This requires a decent server and may take days to sync. Recommended for advanced users.
You can already get started by using one of our pre-synced instances:

-   **If you want to know how to use `chronik-client` in your eCash apps**, go to [Chronik - JS/TS Client](/chronik-js/install).

:::

## Getting started

Make sure you downloaded Bitcoin ABC Chronik in the [previous step](download). In there, you will find an executable `bitcoind`.

To enable Chronik, simply pass `-chronik` as CLI argument:

```bash
./bitcoind -chronik
```

Alternatively, you can also set it in the bitcoin.conf file:

```conf title="bitcoin.conf"
chronik=1
```

:::note
If you have a previously synced but un-indexed node, this will first re-sync Chronik with the node, which could take quite some time, usually 2-3 days.

When initially syncing a node from Genesis, Chronik will slow down initial sync by at least a factor of 2-3x, depending on hardware. It is highly recommended to use a server with a fast SSD.

We're continuously working on optimizing Chronik to bring down initial sync time.
:::

### Debug info

It may be useful to display some extra info so you can ensure everything in Chronik is going well, it is recommended to turn this on initially:

```bash
./bitcoind -chronik -debug=chronik
```

```conf title="bitcoin.conf"
chronik=1
debug=chronik
```

### `-chronikbind`

On mainnet, by default, Chronik is bound to port 8331 on `127.0.0.1` (IPv4) and `::1` (IPv6). If you want to change this, use the `-chronikbind` argument, here e.g. binding it to port 10000 on IPv4:

```bash
./bitcoind -chronik -chronikbind=127.0.0.1:10000
```

```conf title="bitcoin.conf"
chronik=1
chronikbind=127.0.0.1:10000
```

You can specify `-chronikbind` multiple times to bind to multiple hosts, here e.g. binding to both IPv4 and IPv6 on port 10000:

```bash
./bitcoind -chronik -chronikbind=127.0.0.1:10000 -chronikbind=[::1]:10000
```

```conf title="bitcoin.conf"
chronik=1
chronikbind=127.0.0.1:10000
chronikbind=[::1]:10000
```

:::note
Unlike the RPC interface, Chronik is designed to be openly available on the internet, so at this point in development, there's no username/password, no bearer token, cookie or whitelist available.
:::

### `-chroniktokenindex=0`

By default, Chronik has SLP/ALP token indexing **enabled**. However, if you don't need token indexing, you can disable this by providing `-chroniktokenindex=0`.

```bash
./bitcoind -chronik -chroniktokenindex=0
```

:::danger
If you previously had a token index, supplying `-chroniktokenindex=0` will immediately wipe the token index, and to get it back, you will have to run `-chronikreindex`, which can take a long time.
:::

:::tip
Even if your app is XEC only, it is still highly recommended to have the token index enabled, as Chronik provides a lot of checks to prevent accidental token burning. Since many tokens used on eCash have actual value, this will avoid accidentally burning these tokens, e.g. when broadcasting txs, and it is recommended to ignore UTXOs with token values for XEC-only apps.
:::

### `-chronikreindex`

Sometimes it is necessary to re-index only Chronik, e.g. if the database corrupted through an outage. Supply `-chronikreindex` to only reindex the Chronik database and to leave the node untouched.

:::danger
This will immediately wipe the Chronik database, and cannot be undone. You will have to wait for the index to sync again.
:::

:::tip
Since the official release of Chronik, database upgrades for newer versions will be done automatically at startup, so you probably won't have to use this option too often.
:::

### `-chronikperfstats`

If you want to help Bitcoin ABC optimizing Chronik, you can provide this flag when resyncing the node. It collects some performance statistics in the `<datadir>/perf` folder, which will help us with development.

```conf title="bitcoin.conf"
chronik=1
chronikperfstats=1
```
