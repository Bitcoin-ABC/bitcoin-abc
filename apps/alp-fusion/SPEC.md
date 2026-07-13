## Goal

Run a multi-party fusion that spends ALP token UTXOs (plus XEC for fees/dust)
and creates new ALP outputs such that, after sufficient rounds for one `tokenId`,
inputs cannot be reliably linked to outputs.

## Roles

| Role              | Trust assumption                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Participant       | Keeps mnemonic/keys; verifies conservation and own outputs                                                                                    |
| Coordinator       | Matches pools, runs round timing, assembles/broadcasts tx; **must not** learn which components belong to which IP once covert/Tor is in place |
| Chronik / network | Ordinary eCash validity; not a fusion privacy root                                                                                            |

## Pool model

- A pool key is `(tokenId, atomTier)`.
- Participants register only for tiers they can fund.
- A round starts when `minPlayers` is reached (CashFusion-class defaults later;
  early correctness may use a lower floor such as 4).
- One round = one fused transaction for one `tokenId`.

## Round sketch (CashFusion-shaped)

Aligned with Electrum ABC CashFusion ideas, extended for ALP:

1. **Setup** — coordinator publishes round parameters (players, tiers, fee
   policy, component count).
2. **Commit** — each player submits Pedersen commitments covering XEC and token
   atom components (including blanks).
3. **Blind auth** — blind Schnorr (or equivalent) so the coordinator can accept
   components without binding them to a player identity at reveal time.
4. **Covert submit** — components and signatures arrive over a channel that is
   not trivially joinable to the control-session identity (Tor + separate covert
   listener in the CashFusion model).
5. **Assemble** — coordinator builds one tx:
    - inputs: player token UTXOs + XEC fuel as required
    - outputs: randomized ALP atom chops to fresh addresses + XEC change/fees
    - OP_RETURN / EMPP: valid ALP `SEND` for that `tokenId`; optional session
      marker for analytics (marker must not reduce unlinkability)
6. **Sign & broadcast** — players sign their inputs; coordinator broadcasts;
   players verify via Chronik (atoms conserved, own outs received).

## Token / tx constraints

- Fuse **one** `tokenId` per round.
- Never burn tokens: every input atom appears in outputs (minus explicit,
  user-visible policy if any — default is full conservation).
- Respect ALP / wallet policy limits (notably max **29** token outputs per tx).
- Token output amounts should be randomly chunked (avoid fingerprintable
  even splits).
- **Chained ALP txs** can extend a single logical fusion beyond 29 outs (see
  below) — the 29 cap is per transaction, not a hard cap on round size.

## Required rounds vs XEC CashFusion (29-output cap)

ALP `SEND` is limited to **`ALP_POLICY_MAX_OUTPUTS = 29` token outputs per
transaction** (OP_RETURN size). That is a hard **per-tx** ceiling. XEC
CashFusion has no such token-output cap; round size is bounded mainly by
standard tx size (~100 kB) and server params.

### What Electrum CashFusion does today (XEC)

| Parameter                | Typical value                                         |
| ------------------------ | ----------------------------------------------------- |
| Wanted players to start  | `min_clients = 8` (`min_safe_clients = 6`)            |
| Components per player    | `num_components = 23` (inputs + outs + blanks)        |
| Max players (size-bound) | ~25 (`(100000 - 12) // (23 * 173)`)                   |
| Outputs per round        | Can be large (tens–hundreds); not capped at 29        |
| Client churn default     | `queued_autofuse = 4`; `fuse_depth = 0` (keep fusing) |

One strong XEC round can already be a “jumbo” fusion: many players and many
outputs in a single tx, so the combinatorial anonymity set per round is large.
Extra rounds still help (and autofuse keeps going), but a single round is
already meaningful.

### What the 29 cap implies for ALP (single-tx rounds)

Token outs in one fused ALP tx ≤ 29 (XEC dust/change outs do not use that
budget). Rough player × outs budgets that still fit **one** tx:

| Players | Token outs / player (avg) | Fits in 29?                                         |
| ------- | ------------------------- | --------------------------------------------------- |
| 4       | 7                         | yes (28)                                            |
| 8       | 3                         | yes (24) — CashFusion-like player count, thin chops |
| 8       | 4                         | no (32)                                             |
| 12      | 2                         | yes (24)                                            |
| 15+     | ≥2                        | usually no                                          |

So a **single-tx** ALP round can match CashFusion’s player floor (~8) only with
thinner per-player chops. Bigger jumbo rounds (many players × many outs) do
not fit in one ALP tx — but they are not ruled out of the protocol.

### Chained ALP txs: arbitrary-size fusion rounds

The 29 limit is per ALP `SEND` transaction, not per fusion session. A round
may be implemented as a **chain of ALP txs** that together carry an arbitrarily
large anonymity set:

- Partition players / outputs across N linked txs (each ≤ 29 token outs).
- Conservation and unlinkability are defined over the **whole chain**, not each
  hop in isolation.
- Fee cost and latency grow with chain length; that is acceptable when the
  alternative is permanently small pools.
- This is **new fusion protocol work** (coordination, intermediate outs,
  failure/blame across the chain) — not the same as a wallet’s unilateral
  multi-tx send batching.

Early diffs can ship correct **single-tx** rounds. Chained rounds are the
planned path to CashFusion-scale (or larger) ALP fusions without raising the
on-chain ALP output cap.

### Expected rounds (order of magnitude)

Unlinkability compounds across independent rounds. Until chained rounds ship,
each ALP round is smaller than a typical XEC jumbo round, so **more sequential
autofuse rounds** are needed for similar confidence.

|                                               | XEC CashFusion                                                      | ALP fusion (29-cap)                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Anonymity per single tx                       | Large when pools are healthy                                        | Bounded by ≤29 token outs                                                                                            |
| Path to jumbo / arbitrary size                | Usually one tx                                                      | **Chained ALP txs** in one logical round (planned)                                                                   |
| Practical “good enough” churn (single-tx era) | Often a handful of rounds while autofuse runs; depth 0 = continuous | Plan for **more rounds than XEC** — rough target **~2× XEC rounds** at ~8 players / ~3 outs; more if pools stay at 4 |
| One single-tx round “done”                    | Sometimes acceptable for light use                                  | **Not** equivalent to a deep XEC round; weak first hop unless chained                                                |

These are planning numbers, not a formal privacy proof. Exact defaults
(`minPlayers`, outs-per-player, recommended fuse depth, chain length) stay
open until mainnet pool behavior is measured — but the 29-output ceiling is
why ALP should either (a) autofuse **longer** than Electrum’s XEC defaults in
the single-tx era, or (b) invest in **chained rounds** so one session can grow
to arbitrary size.

## Privacy properties (claims)

| Property                                             | When claimed                                          |
| ---------------------------------------------------- | ----------------------------------------------------- |
| Atomic conservation                                  | From first correct implementation                     |
| On-chain input↔output unlinkability inside the round | When pools are deep enough and outputs are randomized |
| Coordinator cannot trivially map IP → components     | Only after covert/Tor-class networking                |

## Wallet integration target

- Shared TS client (no Node-only APIs in the public surface).
- Cashtab: explicit user control (enable, token allowlist, fee / round caps).
- Desktop/daemon clients remain first-class for pool liquidity.

## Suggested verification for later code diffs

Each implementation slice should include tests that a reviewer can run locally,
for example:

- Commitment math (sats + atoms) and blind-auth vectors
- Reject txs that would burn or mis-color ALP
- Multi-player round fixture (mocked network) producing a valid fused tx shape
- Explicit tests that ALP UTXOs are included deliberately (inverse of Electrum’s
  “exclude tokens from CashFusion” behavior)

## Open questions

1. Exact protobuf / message layout vs reuse of CashFusion messages with ALP
   extensions.
2. Default `minPlayers`, component count, and tier ladder for mainnet.
3. Mobile transport: WebSocket gateway vs TLS-only; how much Tor is realistic
   inside Cashtab.
