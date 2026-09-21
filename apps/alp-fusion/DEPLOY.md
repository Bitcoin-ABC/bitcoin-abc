# alp-fusion deploy notes (continuous clients)

CashFusion-class privacy needs **warm pools**. One-shot Cashtab sessions alone
cannot keep `(tokenId, atomTier)` liquid — long-lived desktop/daemon clients
must rejoin after each round (success, idle, or failure).

This document is the ops target for that model.

## What is in-tree today

| Piece                                                          | Status                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| Pool match + one-shot assemble (`PoolMatcher`, `OneShotRound`) | Landed ([D20430](https://reviews.bitcoinabc.org/D20430)) |
| Continuous loop driver (`runFuseLoop`, `ContinuousClient`)     | Landed ([D20449](https://reviews.bitcoinabc.org/D20449)) |
| Framed TCP/TLS control channel (`FusionConnection`)            | Landed ([D20457](https://reviews.bitcoinabc.org/D20457)) |
| Control-channel protobuf (`ClientMessage` / `ServerMessage`)   | Landed ([D20466](https://reviews.bitcoinabc.org/D20466)) |
| Covert sockets + SOCKS5 (`CovertSubmitter`)                    | Landed ([D20506](https://reviews.bitcoinabc.org/D20506)) |
| Coordinator + client round RPCs over the wire                  | Landed ([D20575](https://reviews.bitcoinabc.org/D20575)) |
| Pedersen + blind-auth verify                                   | Landed ([D20591](https://reviews.bitcoinabc.org/D20591)) |
| Chronik sync + covert sign + broadcast                         | Landed ([D20609](https://reviews.bitcoinabc.org/D20609)) |
| Shared `FusionClient` (inject Chronik / keys / `runRound`)     | Landed ([D20638](https://reviews.bitcoinabc.org/D20638)) |
| Coordinator process (`pnpm start:coordinator`)                 | This slice — config from `.env` / `env.sample`           |
| Node participant CLI                                           | Not yet — punchlist 14 in [README.md](./README.md)       |
| Public or staging coordinator                                  | **None deployed**                                        |
| Blame / restart / DoS limits                                   | Not yet — punchlist 25                                   |

Unit verification:

```bash
cd apps/alp-fusion && pnpm test
```

## Target topology

Minimum live smoke fleet for `DEFAULT_MIN_PLAYERS = 8` is large; for early
correctness labs a lower `minPlayers` override is fine. Conceptually:

| Role                    | Count          | Role of process                                            |
| ----------------------- | -------------- | ---------------------------------------------------------- |
| Coordinator             | 1              | Match pools, run rounds, broadcast fused tx (no user keys) |
| Continuous participants | ≥ `minPlayers` | Unique mnemonic each; rejoin until stopped                 |

```
                 ┌──────────────────┐
                 │   Coordinator    │
                 │   :8788 TCP/TLS  │
                 └────────┬─────────┘
        ┌─────────────────┼─────────────────┐
   Client 1 …        Client N (continuous)   …
   (mnemonic A)      (rejoin after each round)
```

Each continuous client should:

1. Sync wallet (Chronik) and select fuseable ALP UTXOs + XEC fuel.
2. Register for every `(tokenId, atomTier)` it can fund (or a pinned tier).
3. Run one round attempt (`runOnce`).
4. Delay per `FUSE_LOOP` (`success` / `failure` / `idle`), then rejoin — until
   operator stop (SIGINT).

Default delays (Electrum-ABC-shaped):

| Outcome  | Pause |
| -------- | ----- |
| `fused`  | 5s    |
| `failed` | 15s   |
| `idle`   | 30s   |

## Deployed servers

**None.** No public or staging hostname is published. Local bind
(build, then run compiled `dist`; config from `.env`):

```bash
cd apps/alp-fusion
cp env.sample .env   # edit CHRONIK_URLS (and lab HOST / COVERT_DOMAIN / MIN_PLAYERS)
pnpm build
pnpm start:coordinator
```

`pnpm dev:coordinator` uses `tsx` for source without a rebuild (still reads
`.env`). Defaults: bind `127.0.0.1:8788` (control) / `:8789` (covert),
advertise the bind host, `minPlayers=8`. Lab (all interfaces): set
`HOST=0.0.0.0`, `COVERT_DOMAIN=<reachable-host>`, `MIN_PLAYERS=2`.
`COVERT_DOMAIN` is required for wildcard bind so FusionBegin does not tell
peers to dial `0.0.0.0`. Mocha still starts `FusionCoordinator` on
`127.0.0.1` in unit tests.

After the participant CLI (14) lands, staging deploy (15) is:

1. One host: coordinator with `HOST=0.0.0.0`, control `:8788` / covert
   `:8789`, and `COVERT_DOMAIN` set to a hostname/IP clients can reach.
   Lab: `MIN_PLAYERS=2`. Chronik URL(s) in `CHRONIK_URLS`.
2. N Node participant CLIs, each with a **unique** mnemonic, same
   `tokenId`, overlapping atom tiers, and enough XEC for fees/dust.
3. Participants in **loop / continuous** mode so pools refill.
4. Confirm: two lab wallets complete a round; txid visible on Chronik.
5. Publish the control/covert (later WSS) URLs. Until then Cashtab has
   nothing to dial.

Public launch (23) additionally requires TLS (21), WSS (16),
`minPlayers >= 8`, and warm-pool daemons (22) for each advertised
`(tokenId, atomTier)`.

Wallets and daemons call `FusionClient` (one-shot `fuseOnce` or continuous
`run` / `stop`) once the CLIs exist. Expect roughly:

1. **One coordinator** bound on `0.0.0.0:8788` (TLS before public).
2. **N participant hosts**, each with a **unique** mnemonic, same target
   `tokenId`, overlapping atom tiers, and enough XEC for fees/dust.
3. Participants run in **loop / continuous** mode (not one-shot exit) so pools
   refill after each fusion.
4. Outbound HTTPS to Chronik from every participant (and from the coordinator
   for broadcast).

## Privacy / ops reminders

- Prefer `DEFAULT_MIN_PLAYERS >= 8` on public coordinators; 2-player rounds
  deanonymize the counterparty.
- `tokenId` remains public in every ALP `SEND`.
- Covert/Tor is required before claiming CashFusion-class network privacy —
  plain TCP control channels are correctness-only. `CovertSubmitter` +
  SOCKS5 are the hook; participants point `socks5` at a Tor SOCKS port
  (typically `127.0.0.1:9050`) when they dial a public coordinator. The
  coordinator side still needs an inbound Tor path (onion service).
- Covert components now carry a real blind-Schnorr signature, but reveal is
  **not yet unlinkable to the coordinator**: `saltedComponentHash` is still
  `sha256(component)`, so the coordinator maps every revealed component to
  its committer. Salted `sha256(salt || component)` + blame proofs remain.
