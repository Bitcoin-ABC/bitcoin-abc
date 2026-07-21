# alp-dex

Protocol and API detail: [SPEC.md](./SPEC.md) (**spec version 1**).

## Configure

```bash
cp config.sample.json config.json
# edit config.json — port, token ids, feePct, utxo sizes
```

All runtime settings live in `config.json` (see SPEC). It is required at the
package root and is gitignored. The app exits on startup if it is missing.

## Why ALP needs an open AMM node

ALP tokens trade on eCash today mainly through custodial venues, one-off
P2P deals, or wallet-specific integrations. There is no small, open server
that an operator can run to **make a market** for arbitrary ALP pairs using
liquidity they actually control.

**alp-dex** is that node: a permissionless constant-product AMM LP that
anyone can deploy for any allowlisted ALP token pair. Operators fund local
reserves; takers (wallets, bots, aggregators) quote and settle against the
node over a public HTTP API.

A separate **coordinator server** may list, rank, and route to many
independent alp-dex instances (and optionally collect a platform fee).
Cashtab and other wallets can support an instance once that coordinator
whitelists its public URL — without making the coordinator itself the
liquidity source.

## Goals

Must provide:

1. **Self-hosted LP** — one mnemonic, three HD roles (seller / slush / fee),
   Postgres for audit, Chronik for sync. No shared custody with a
   coordinator.
2. **Local-liquidity pricing** — spot and size quotes from **seller +
   slush** atom reserves (constant-product). Fills spend **seller**
   inventory only.
3. **Permissionless pairs** — operators copy `config.sample.json` →
   `config.json` and set which `tokenId` pairs to trade (no default
   allowlist in-repo — see SPEC).
4. **Postage-protocol settle (SPEC v1)** — taker builds and signs their side;
   the node adds XEC fuel + exact-size token UTXOs and broadcasts. Taker-pays
   all fees is possible in principle but out of scope for SPEC v1.
5. **Coordinator-optional** — platform fee and listing are opt-in; a lone
   node is useful without any aggregator.

## Benefits (if the end state ships)

| Benefit                         | Why it matters                                                                |
| ------------------------------- | ----------------------------------------------------------------------------- |
| Anyone can make a market        | Token issuers and LPs are not gated on a single venue                         |
| Wallet-agnostic API             | Cashtab, bots, and other clients share one HTTP contract                      |
| Coordinator discovery           | Users find liquid nodes without each wallet hardcoding every LP URL           |
| Combined multi-server liquidity | Coordinators (and wallets) can quote/route across many independent LPs        |
| Hot-wallet automation           | Inventory reshape, postage mint, and misc sweep run without manual UTXO craft |
| Reviewable, open implementation | Operators and wallets can audit the same code they run                        |

## Trust model (important)

alp-dex is **not** a trustless on-chain AMM contract. It is a hot-wallet
market maker with a public API.

### What is closer to trust-minimized

- Settlement is a normal eCash ALP transaction. Once broadcast and
  confirmed, outcomes are as final as any other chain tx.
- The taker builds outputs and signs their own inputs before settle. They
  can inspect maker fee (and optional coordinator fee) outs before signing.
- At settle time the node checks the price leg against constant-product
  expectations (planned: ±1% band) using its current local reserves.

### What still requires trust / reputation

Advertising UTXOs and **provably holding** them (Chronik-visible balances
on seller/slush) does **not** guarantee that the node will finalize a
swap.

A malicious or broken node can:

- Quote honestly, then refuse settle, go offline, or stall.
- Change inventory between quote and settle (concurrency / race).
- Prefer some takers over others (censorship).

This is **not** primarily a critical-loss problem for a careful taker: a
well-built client does not pre-fund the LP, and can abort if the completed
tx is wrong or never arrives. It **is** a **reputation and availability**
problem — bad nodes waste time, fail UX, and poison aggregator rankings.

So:

- **On-chain truth** proves inventory _can_ exist.
- **Reputation + coordinator whitelist** decide whether a wallet should
  _rely_ on a given node to finalize.

Cashtab (and similar) should treat coordinator whitelist as an
availability/quality signal, not as cryptographic proof that every quote
will settle.

## Roles

| Role                  | Responsibility                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------ |
| **LP operator**       | Runs alp-dex, funds slush, sets pairs/fees, keeps Chronik/Postgres healthy                 |
| **Taker / wallet**    | Quotes, builds postage-ready txs, verifies outs, posts settle                              |
| **Coordinator**       | Optional: lists/whitelists LP URLs, aggregates liquidity across nodes, platform fee params |
| **Chronik / network** | Ordinary UTXO and ALP validity; not an LP honesty oracle                                   |

## End state

1. **Open-source alp-dex** in this repo — runnable by anyone for any ALP
   pairs they configure.
2. **Stable HTTP API** for status, inventory, quotes, templates, and settle
   (see [SPEC.md](./SPEC.md)).
3. **Inventory automation** — exact-size seller UTXOs, postage stamps, daily
   misc sweep to the fee address.
4. **Optional coordinator opt-in** — platform fee fetch + status flag so a
   coordinator can safely list the node.
5. **Cashtab (and other wallets)** can swap via whitelisted alp-dex URLs
   without embedding LP private keys or pair config.
6. **Combined liquidity across servers** — a coordinator (or wallet) can
   discover many independent alp-dex instances for the same pair, pick the
   best quote, and — where useful — split or failover a trade across nodes
   so depth is not capped by a single operator’s reserves.
7. **Deploy path** — Docker/nginx notes, env sample, mnemonic helper, ops
   scripts for recovery.

## Roadmap

Docs-first, then implementation slices sized for review. Each later diff
should ship tests a reviewer can run locally.

1. **Docs [D20325](https://reviews.bitcoinabc.org/D20325)** — motivation,
   trust model, end state, roadmap, SPEC (API + inventory + settle contract).
2. **Scaffold [D20354](https://reviews.bitcoinabc.org/D20354)** — TypeScript
   package under `apps/alp-dex`, mocha, Express stub (`GET /`,
   `GET /api/v1/status` health), TeamCity `alp-dex-tests`.
3. **Config [D20363](https://reviews.bitcoinabc.org/D20363)** — `tokenId`
   asserts; required `config.json` (`port` + per-pair `feePct` / utxo sizes);
   fixed `POSTAGE_SATS`; `config.sample.json`; pure unit tests (no Chronik).
4. **Wallet / HD** — Derive seller / slush / fee (`m/44'/1899'/{account}'/0/0`);
   `FEE_ADDRESS` resolution; mnemonic script; reject address collisions.
5. **Chronik sync + genesis** — Client wiring; genesis fetch; allowlisted
   `TradedTokens`; wallet `sync()` against mock Chronik.
6. **Pricing** — Wire local seller+slush reserves into constant-product
   quotes (reuse `ecash-wallet` CP helpers; do not re-prove the math here).
7. **Inventory automation** — Classify seller UTXOs; reshape wrong sizes via
   slush; mint inventory + postage; misc → fee; mocked-wallet tests.
8. **Quote API** — Read-only routes: available, inventory, spot, size quotes,
   settleable output templates (no broadcast).
9. **Settle** — Parse/validate postage-ready ALP txs; settle queue; fuel +
   sign + broadcast (mocked Chronik/broadcast); ±1% CP band; maker fee
   schema.
10. **DB + ops** — `schema.sql`, swap audit inserts, summarize / rebalance
    scripts, optional Telegram message builders.
11. **Coordinator opt-in + deploy** — Platform-fee source (mockable fetch),
    status flag for whitelist discovery, Docker/nginx, public HTTPS checklist.
12. **Wallet + multi-server liquidity** — Cashtab (and others) consume
    whitelisted alp-dex URLs via a coordinator; quote → template → settle;
    best-of / split / failover across multiple LPs for the same pair.

Optional later: public LOKAD emission for indexer discovery of settled
swaps; multi-denomination inventory strategies beyond single `utxoQty` +
change.

## Suggested verification for later code diffs

- Config parsers reject bad pairs / colliding fee addresses.
- Inventory reshape never spends batons; only exact-size seller UTXOs are
  fill-eligible.
- Settle rejects wrong fee pct, wrong platform fee (when enabled), and
  price legs outside the CP band.
- Mocked end-to-end: template → taker-signed hex → fuel → broadcast shape.
