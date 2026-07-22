# alp-dex protocol SPEC

**Spec version:** 1

This document is **alp-dex SPEC version 1**. README and later diffs that say
“v1” / “version 1” mean this revision of the contract (settle model, config
surface, planned HTTP API). Incompatible changes (for example a taker-pays
XEC-fee settle path, or a breaking API shape) should bump this number and
call out what changed. The planned HTTP prefix `/api/v1/...` matches this
spec version unless a future bump says otherwise.

## Goal

Run a self-hosted ALP AMM LP that:

- Prices allowlisted pairs from **local** seller + slush atom reserves
  (constant-product).
- Exposes a public HTTP API for discovery, quotes, and postage-protocol
  settlement.
- Optionally opts into a **coordinator server** platform fee so aggregators
  can whitelist and route to the node.

An end goal beyond a single node is **combined liquidity**: coordinators and
wallets query many independent alp-dex instances for the same pair, then
best-quote, split, or failover so effective depth is not capped by one
operator’s reserves.

## Roles and trust

| Role        | Trust assumption                                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| LP operator | Controls mnemonic; must keep Chronik sync and inventory automation healthy                                                                           |
| Taker       | Verifies template outs and settle result; should not treat quotes as hard reservations                                                               |
| Coordinator | Lists/whitelists LP base URLs; may publish `platformFeePct` + `platformFeeAddress`; aggregates quotes / routes across nodes; not the liquidity vault |
| Chronik     | Ordinary chain views; proves UTXOs _exist_, not that the LP will finalize                                                                            |

**Reputation residual:** Even when Chronik shows the advertised seller/slush
balances, the LP can still decline or fail to finalize. Clients and
coordinators must treat uptime and settle success as reputation, not as a
solved cryptographic guarantee. This is primarily an availability / UX risk
for careful takers, not a designed custodial loss path.

## Wallet model

One BIP39 mnemonic on the LP server; HD path `m/44'/1899'/{account}'/0/0`:

| Account      | Role                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| **0 Seller** | Spendable inventory: exact-size traded-token UTXOs + postage stamps. Public swap address. Fills spend these only. |
| **1 Slush**  | Deposit / change / LP reserve. Operator tops up here. Receives price-leg `fromToken` on settle.                   |

**Fee payout** is **not** an HD account on the server. Operators set a required
`feeAddress` in `config.json`. The fee wallet should be off the server and
does not need to be a hot wallet. Maker fees and misc sweeps pay out to that
address only. Config rejects `feeAddress` equal to seller or slush. Provision
the fee wallet from a seed that never reaches the LP host.

**Pricing reserves** = seller + slush atom sums for each token.  
**Fill selection** = seller UTXOs of configured inventory size only.

## Config model (planned)

Operators choose which pairs to trade, inventory sizes, fees, and listen
port. There is **no default trading allowlist in the repo** — each
deployment copies `config.sample.json` → `config.json` and edits it.
`config.json` is the single runtime config file (required at the package
root, gitignored). No `.env` file.

### `config.json`

| Field        | Purpose                                                                                 |
| ------------ | --------------------------------------------------------------------------------------- |
| `port`       | HTTP listen port                                                                        |
| `mnemonic`   | Valid BIP39 English mnemonic; seeds seller + slush only                                 |
| `feeAddress` | Required `ecash:` fee / misc-sweep payout (≠ seller/slush; off-server; need not be hot) |
| `pairs`      | Non-empty pair list                                                                     |

No global default fee or utxo size. Each pair must set:

| Field      | Purpose                                               |
| ---------- | ----------------------------------------------------- |
| `aTokenId` | 64-hex ALP token id                                   |
| `bTokenId` | 64-hex ALP token id (undirected with `aTokenId`)      |
| `feePct`   | Maker fee as a decimal in `[0, 1]` (e.g. `0.01` = 1%) |
| `aUtxoQty` | Inventory UTXO size (human units) for `aTokenId`      |
| `bUtxoQty` | Inventory UTXO size (human units) for `bTokenId`      |

Later slices may add more top-level fields (e.g. database URL) to the same
file. To add more tokens, append another object to `pairs[]`.
If the same token appears in multiple pairs, its utxoQty must match in
every pair. The process exits on startup if `config.json` is missing.

Postage stamp size is **not** configurable: fixed at `POSTAGE_SATS = 1000`
(10 XEC) in code. Inventory automation should mint stamps from all loose
slush XEC; there is no `mintBatch` config.

### Coordinator opt-in (planned `config.json` fields)

| Field                | Purpose                                                                           |
| -------------------- | --------------------------------------------------------------------------------- |
| `platformFeeEnabled` | When true, templates/settle inject and validate coordinator fee outs              |
| Coordinator base URL | Fetch live `platformFeePct` + `platformFeeAddress` from coordinator `/api/status` |

`GET /api/v1/status` advertises `platformFeeEnabled` so a coordinator can
discover makers that opt into fee enforcement before whitelisting them.

## Pricing

Constant-product over local reserves (no external oracle):

- Spot (human units): `toQty / fromQty` using Chronik genesis decimals.
- Exact-in: `amountOut = amountIn * reserveOut / (reserveIn + amountIn)`.
- Exact-out: ceil division for required `amountIn`.

Maker `feePct` is **on top of** the price leg (paid in `fromToken` to the
fee script). Optional coordinator platform fee is likewise an explicit
mid-output the taker can inspect.

Settle accepts the buyer’s `toToken` atoms within a small band of the CP
expectation for the price leg (planned default **±1%**).

## Inventory automation

Each traded token has inventory denomination `utxoQty` (human units).  
Atoms per fill UTXO = `utxoQty × 10^decimals`.

Planned maintain loop (startup, sync interval, after successful settle):

1. Wrong-sized traded-token UTXOs on seller → slush.
2. Slush traded tokens → seller inventory UTXOs at configured size
   (respect ALP max token outs per tx).
3. Loose slush XEC → postage stamps on seller.
4. Periodic misc seller UTXOs (non-traded tokens, odd XEC; batons skipped)
   → fee script.

**Operator habit:** fund **slush** only. Do not hand-build seller inventory
except recovery scripts.

## Settlement flow (postage)

**SPEC v1 settle model: postage is required.** The taker builds and signs a
postage-ready ALP tx (exact outs known up front); the LP adds fuel
(postage stamps + exact-size `toToken` inventory), co-signs, and
broadcasts. The server pays miner/dust XEC for finalization.

A “taker pays all XEC fees” path (closer to Agora offers) is conceivable:
outs are still fixed ahead of time, so a client could also supply correct
fee/change outs and the server would only validate + co-sign. That is **out
of scope for SPEC v1** (would be a later spec version if pursued). Dual
client/server signing is already required, and the server is the
broadcaster — having the LP handle XEC fuel keeps one settle path that
works for both gasless and XEC-funded wallets. Shipping both fee models
now would be overkill; postage is the broader default.

Flow:

1. Taker `GET`s a settleable output template (scripts + atoms + fees).
2. Taker builds an ALP send (EMPP), signs own inputs, `POST`s hex +
   `prePostageInputSats` + expected `tokenId` / `atoms`.
3. Node parses EMPP/ALP, validates schema / fees / CP band, serializes
   settle through a queue, selects N exact-size `toToken` seller UTXOs,
   adds postage fuel, signs, broadcasts.
4. On success: audit row + optional post-swap inventory pass.

Exact-size seller inventory (advertised `utxoQty` per `tokenId`) lets the
taker construct outs including any token change before the server attaches
a variable number of inputs.

Concurrency note: a process-local settle queue avoids double-spending the
same seller UTXOs; it is **not** an on-chain reservation. Concurrent quotes
can still race.

## HTTP API (planned)

Listen port from `config.json` `port` (sample default **3003**).
CORS open for browser takers. Rate-limited.

| Method | Path                                     | Purpose                                              |
| ------ | ---------------------------------------- | ---------------------------------------------------- |
| GET    | `/`                                      | Service metadata                                     |
| GET    | `/api/v1/status`                         | Health, seller address, pairs, postage, platform fee |
| GET    | `/api/v1/token/:tokenId/available`       | Seller spendable atoms for one token                 |
| GET    | `/api/v1/swap/inventory`                 | `tokenId →` human balance (seller+slush)             |
| GET    | `/api/v1/swap/:from/:to/price`           | Spot + reserves + pair `feePct`                      |
| GET    | `/api/v1/swap/:from/:to/amm/:qty`        | CP exact-in discovery quote                          |
| GET    | `/api/v1/swap/:from/:to/quote/:qty`      | Exact-in + fee output template                       |
| GET    | `/api/v1/swap/:from/:to/price/:qty`      | Exact-out + fee output template                      |
| GET    | `/api/v1/swap/:from/:to?from\|to&feePct` | Settleable CP output template                        |
| POST   | `/api/v1/swap/:from/:to`                 | Settle postage-ready tx                              |

### Settle body (planned)

- `serializedTxHex` — taker-signed, postage-ready tx hex
- `prePostageInputSats` — sats already covered by taker inputs
- `tokenId` — must equal receiving (`to`) token
- `atoms` — atoms of `to` expected by taker

### Settle responses (planned)

- Success: `{ success, txid, postagePaidSats }`
- Validation failure: `400` (+ optional audit row `is_valid=false`)
- Fuel/broadcast failure: `500` (+ optional audit row `broadcasted=false`)

## Output schema (parsed, excl. OP_RETURN)

Planned mid-tx shape the node validates:

1. Price leg → slush (`fromToken`)
2. Maker fee → fee script (`fromToken`), if `feePct > 0`
3. Platform fee → coordinator fee script (`fromToken`), if enabled
4. Buyer receive → taker script (`toToken`)
5. Optional change outs (schema-allowed)

`feePct` on template/settle must match the configured pair fee.

## Dependencies (planned)

| Dependency       | Role                                              |
| ---------------- | ------------------------------------------------- |
| `ecash-lib`      | HD, ALP/EMPP, scripts, tx ser/deser               |
| `ecash-wallet`   | Chronik sync, `PostageTx` fuel + sign + broadcast |
| `chronik-client` | Genesis + UTXO sync                               |
| Express stack    | HTTP API, helmet, CORS, rate limit                |
| Postgres         | Swap audit log                                    |

## Coordinator integration points

1. LP sets platform-fee opt-in + coordinator base URL.
2. On quote/template/settle, LP fetches coordinator `/api/status` for fee
   pct + address (short TTL cache). Failures fail settle when enabled.
3. Templates inject the platform fee out; settle requires exact atoms +
   script when enabled, and rejects unexpected platform fee when disabled.
4. Audit columns record platform fee fields.
5. Coordinator whitelist is **out of band**: operators register their public
   LP base URL with the coordinator. alp-dex only advertises
   `platformFeeEnabled` and enforces fee outs when opted in.

Maker fee and platform fee are independent; addresses must not collide with
seller or slush.

## Open questions

1. Exact ±% settle band and whether it should be configurable per pair.
2. Whether public LOKAD pushdata should mark settled swaps for indexers.
3. Multi-denomination inventory vs single `utxoQty` + change (design tradeoff;
   SPEC v1 targets single size + change).
4. How aggressively wallets should retry / fail over across whitelisted
   nodes when settle is refused.
5. When and how to **split** a single logical swap across multiple LPs
   (vs best-of-one) given postage settle and per-node inventory races.
6. Minimum status fields a coordinator should require before whitelist
   (TLS, `platformFeeEnabled`, uptime probes, settle success rate).
