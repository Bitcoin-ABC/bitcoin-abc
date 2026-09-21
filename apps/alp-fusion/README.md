# alp-fusion

Protocol detail: [SPEC.md](./SPEC.md).

## Why ALP needs fusion

ALP balances live on a transparent chain. Anyone can follow token UTXOs from
mint → transfers → current holders. That is useful for auditability and bad for
everyday privacy:

- A merchant who receives an ALP payment can often see where those tokens came
  from (payroll, prior buys, other counterparties).
- Competitors or observers can map holder graphs for a given `tokenId`.
- Cashtab / mobile users have no opt-in way to break that history today.

**Fusion** does not hide that someone holds a token. It makes it hard to prove
which of a round’s outputs belong to which of the round’s inputs — so later
spends are no longer a clean continuation of a known prior history.

## Privacy requirements

Must provide:

1. **Non-custodial rounds** — participants keep keys; the coordinator never
   holds tokens or XEC.
2. **Input ↔ output unlinkability within a round** — for a fused `tokenId`, an
   observer should not be able to map a participant’s inputs to their outputs
   with useful confidence when the anonymity set is large enough.
3. **Amount conservation** — token atoms and XEC fees/dust balance; no
   burns or theft via the protocol path.
4. **Network privacy path** — a realistic plan to stop the coordinator (or a
   network observer) from trivially linking IP ↔ components (CashFusion uses
   Tor + a covert channel; ALP fusion must reach equivalent strength before it
   is presented as production privacy).

## Benefits (if the end state ships)

| Benefit                                     | Why it matters                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| Breakable token history                     | Holders can spend ALP without handing counterparties a full prior trail     |
| Opt-in, same mental model as XEC CashFusion | Users who already understand “fuse then spend” can apply it to tokens       |
| Wallet-native UX                            | Privacy only helps if Cashtab (and others) can turn it on without a VPS CLI |
| Ecosystem parity                            | XEC already has fusion; ALP is the main token surface without it            |

## Today: Electrum ABC CashFusion (XEC) vs this project (ALP)

|                    | Electrum ABC CashFusion (XEC)                                                | alp-fusion (ALP)                                                                           |
| ------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Asset              | Native XEC only                                                              | One ALP `tokenId` per pool / round                                                         |
| Status             | Production in Electrum ABC (and some third-party wallets)                    | Library + localhost wire tests through `FusionClient`. No process, no public coordinator.  |
| Token UTXOs        | **Excluded** — ALP/SLP coins are frozen out of fusion so they are not burned | **Target** — fuse ALP deliberately with correct `alpSend` coloring                         |
| Coordinator        | Public fusion servers; long-lived desktop/daemon clients keep pools warm     | Same role expected; public coordinators + continuous clients required                      |
| Covert / Tor       | Separate covert channel over Tor                                             | Covert sockets + SOCKS5 hook in-tree; live Tor still required for CashFusion-class privacy |
| Crypto sketch      | Blind Schnorr component auth, Pedersen commitments, shuffled multi-party tx  | Same family, extended for token atoms + ALP EMPP `SEND`                                    |
| Wallet UX          | Toggle in Electrum; “spend only fused coins”                                 | End goal: Cashtab toggle (+ other wallets via a shared client)                             |
| What stays visible | That XEC moved in a large fusion                                             | That a given `tokenId` moved in a fusion; amounts↔addresses obscured inside the round      |

Electrum already gives XEC holders opt-in fusion and
actively _avoids_ touching ALP UTXOs; this project is the missing path that
fuses ALP without burning tokens.

## End state

1. **Public coordinators** with TLS (and covert/Tor-class unlinkability).
2. **Continuous desktop/daemon clients** that keep `(tokenId, atomTier)` pools
   liquid (mobile alone cannot warm pools).
3. **Shared TypeScript client** usable from Node and Cashtab.
4. **Cashtab (and other wallets)** expose fuse / auto-fuse for selected tokens.
5. **Operational norms** close to CashFusion: deep enough pools, randomized
   outputs, multi-round churn, blame/restart for bad rounds.

## Expected benefits of that end state

- ALP holders get the same _class_ of opt-in privacy XEC holders already have.
- Merchants and apps can accept ALP without forcing payers to expose full
  histories by default (payers can fuse first).
- Liquidity from daemons makes short Cashtab sessions useful instead of empty
  pools.
- One reviewed protocol + client library.

## Roadmap

1. **Docs [D20284](https://reviews.bitcoinabc.org/D20284)** — privacy model, Electrum comparison, end state, roadmap, SPEC.
2. **Protocol primitives [D20318](https://reviews.bitcoinabc.org/D20318)** —
   Pedersen over sats + token atoms, blind Schnorr, and component hashing in
   `ecash-lib`, plus alp-fusion session/round constants; unit tests only.
3. **Tx assembly [D20400](https://reviews.bitcoinabc.org/D20400)** — build/validate
   fused ALP `SEND` + fee/dust rules against `ecash-lib` limits
   (`ALP_POLICY_MAX_OUTPUTS`, dust, atom conservation); unsigned single-tx only.
4. **Coordinator + one-shot client [D20430](https://reviews.bitcoinabc.org/D20430)** —
   in-process pool match → collect contributions → shuffle outs →
   `assembleAlpSend`; unit tests. No network, signing, broadcast, or Tor yet
   (those follow).
5. **Continuous client + deploy notes [D20449](https://reviews.bitcoinabc.org/D20449)** —
   `runFuseLoop` / `ContinuousClient` (Electrum-ABC-style rejoin delays) +
   [DEPLOY.md](./DEPLOY.md) ops target.
6. **Control-channel TCP/TLS framing [D20457](https://reviews.bitcoinabc.org/D20457)** —
   CashFusion-shaped framed sockets (`FusionConnection`, `connect` / `listen`).
7. **Control-channel protobuf messages [D20466](https://reviews.bitcoinabc.org/D20466)** —
   CashFusion-shaped `ClientMessage` / `ServerMessage` (+ ALP pool fields)
   encode/decode over `FusionConnection`.
8. **Covert channel + SOCKS5 (Tor hook) [D20506](https://reviews.bitcoinabc.org/D20506)** —
   separate covert sockets (`CovertSubmitter`, slots/spares, `randTrap`
   stagger) and SOCKS5 CONNECT with unique per-connection credentials. No live
   Tor daemon, Chronik, or signing.
9. **Control-channel round RPCs [D20575](https://reviews.bitcoinabc.org/D20575)** —
   hello / join / pool status / FusionBegin / StartRound / PlayerCommit +
   covert component reveal, then unsigned `FusionResult` via `OneShotRound`.
10. **Pedersen + blind-auth verify [D20591](https://reviews.bitcoinabc.org/D20591)** —
    dual Pedersen openings on PlayerCommit (sats → excess fee, atoms → 0)
    and Schnorr-unblinded covert component signatures.
11. **Chronik sync + covert sign + broadcast [D20609](https://reviews.bitcoinabc.org/D20609)** —
    load P2PKH UTXOs from Chronik, sign fused inputs over covert
    (`CovertTransactionSignature`), broadcast via injected Chronik.
12. **Shared client library [D20638](https://reviews.bitcoinabc.org/D20638)** —
    `FusionClient` so wallets inject Chronik / keys / outputs / `runRound`.
    Node TCP is `createNodeFusionClient` in `src/node.ts`.

### Remaining (Cashtab launch punchlist)

Each item is one Differential. **13–19** are the lab bar: one opted-in
Cashtab Android user completes a round against a staging coordinator.
**20–25** are public launch. Cashtab HD work is a parallel track
([cashtab/ROADMAP.md](../../cashtab/ROADMAP.md) P0) and blocks 19.

**No coordinator is deployed.** Mocha starts `FusionCoordinator` on
`127.0.0.1` only. There is no hostname to ping.

13. **Coordinator CLI** — process that binds control + covert and takes
    Chronik URL, host, ports, `minPlayers`. `FusionCoordinator.start()`
    exists; there is no `bin` / `pnpm start`.
14. **Node participant CLI** — mnemonic + Chronik + coordinator host →
    `createNodeFusionClient` loop. Needed to smoke a live round and later
    to warm pools.
15. **Staging deploy** — run 13+14 on a host; publish control/covert
    (later WSS) URLs; confirm a 2-player lab round. Ops after 13 and 14
    land — see [DEPLOY.md](./DEPLOY.md).
16. **Coordinator WSS gateway** — framed protobuf over TLS WebSocket so
    the Cashtab Android WebView can join. Raw Node TCP stays daemon-only.
17. **FusionClient WebSocket `runRound`** — inject WSS transport without
    importing `src/node.ts`.
18. **Cashtab HD wallets** — fresh receive/change per round. Hard blocker;
    several Cashtab diffs ([cashtab/ROADMAP.md](../../cashtab/ROADMAP.md) P0).
19. **Cashtab wallet adapter** — `buildContribution` + keys + UTXO lock
    from HD Cashtab state; one-shot `fuseOnce` against staging (15).
20. **Cashtab Fusion UX** — opt-in toggle, token allowlist, fee caps,
    status, fuse-now. Do not ship the toggle before 19.
21. **TLS on coordinator TCP** — framing already has `listen({ ssl: true })`;
    `FusionCoordinator.start()` does not enable it.
22. **Warm-pool daemons** — deploy ≥ `minPlayers` continuous Node clients
    for target `(tokenId, atomTier)`. Cashtab one-shots cannot fill pools.
23. **Public coordinator** — TLS + WSS, `minPlayers >= 8`, Chronik
    broadcast, URL in Cashtab config. Replaces staging defaults.
24. **Covert unlinkability** — salt `sha256(salt || component)` so the
    coordinator cannot map reveal → committer.
25. **Blame / restart + DoS limits** — recover a bad player; bound
    unmatched covert blobs and sessions.

Tor / onion inbound and Android background sessions (count/duration)
follow public launch. They are not required for the first opted-in
round. See [cashtab/ROADMAP.md](../../cashtab/ROADMAP.md) P4.
