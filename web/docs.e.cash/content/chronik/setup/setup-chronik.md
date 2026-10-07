---
title: Setup Chronik
---

# Setup Chronik

After downloading Chronik, you need to run it to set up an instance.

> **Warning**
>
> This tutorial covers running a `bitcoind` instance with Chronik enabled. That needs a decent server and can take days to sync. It is aimed at advanced users. You can use one of our pre-synced public endpoints instead:
>
> - **If you want to use `chronik-client` in your eCash apps**, follow [Install chronik-client](/chronik/chronik-client/install/).

## Getting started

Make sure you downloaded Bitcoin ABC Chronik in the [previous step](/chronik/setup/download/). You should have a `bitcoind` executable.

To enable Chronik, pass `-chronik` on the command line:

```bash
./bitcoind -chronik
```

Or set it in `bitcoin.conf`:

```conf
chronik=1
```

> **Note**
>
> If you had a previously synced node without a Chronik index, Chronik will first re-sync with your node, which can take a long time (often around 2–3 days).
>
> When syncing from genesis, Chronik slows initial sync by roughly 2–3× depending on hardware. Use a fast SSD when possible. We are continually improving initial sync performance.

### Debug info

Turn on extra logging while you verify your setup:

```bash
./bitcoind -chronik -debug=chronik
```

```conf
chronik=1
debug=chronik
```

### `-chronikbind`

On mainnet Chronik defaults to port `8331` on `127.0.0.1` (IPv4) and `::1` (IPv6). To change that, use `-chronikbind`, for example port 10000 on IPv4 only:

```bash
./bitcoind -chronik -chronikbind=127.0.0.1:10000
```

```conf
chronik=1
chronikbind=127.0.0.1:10000
```

You can repeat `-chronikbind` for multiple listeners, e.g. IPv4 and IPv6 on port 10000:

```bash
./bitcoind -chronik -chronikbind=127.0.0.1:10000 -chronikbind=[::1]:10000
```

```conf
chronik=1
chronikbind=127.0.0.1:10000
chronikbind=[::1]:10000
```

Unlike the RPC interface, Chronik is designed to be reachable on the open internet. At this stage of development there is no built-in username/password, bearer token, cookie, or IP whitelist.

### `-chroniktokenindex=0`

By default Chronik indexes SLP/ALP tokens. If you do not need token indexing, disable it with `-chroniktokenindex=0`:

```bash
./bitcoind -chronik -chroniktokenindex=0
```

> **Danger**
>
> If you previously had a token index, `-chroniktokenindex=0` will wipe it immediately. Restoring it requires `-chronikreindex`, which can take a long time.

> **Tip**
>
> Even for XEC-only apps, keeping token indexing enabled is strongly recommended: Chronik adds burns checks when broadcasting transactions and similar protections for tokens that have real value.

### `-chronikreindex`

Re-index only Chronik (for example after database corruption) without touching the rest of the node:

```bash
./bitcoind -chronik -chronikreindex
```

> **Danger**
>
> This wipes the Chronik database immediately and cannot be undone. You will need to wait for the index to sync again.

> **Tip**
>
> Chronik databases from older node versions are not upgraded automatically. Use this flag (or `-reindex`) if the schema version is too old.

### `-chronikperfstats`

Help the team optimize Chronik by collecting performance stats under `<datadir>/perf` during a resync:

```conf
chronik=1
chronikperfstats=1
```
