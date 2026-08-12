# alp-fusion deploy notes (continuous clients)

CashFusion-class privacy needs **warm pools**. One-shot Cashtab sessions alone
cannot keep `(tokenId, atomTier)` liquid — long-lived desktop/daemon clients
must rejoin after each round (success, idle, or failure).

This document is the ops target for that model.

## What is in-tree today

| Piece                                                          | Status                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------- |
| Pool match + one-shot assemble (`PoolMatcher`, `OneShotRound`) | Landed ([D20430](https://reviews.bitcoinabc.org/D20430))       |
| Continuous loop driver (`runFuseLoop`, `ContinuousClient`)     | Landed ([D20449](https://reviews.bitcoinabc.org/D20449))       |
| Framed TCP/TLS control channel (`FusionConnection`)            | Landed ([D20457](https://reviews.bitcoinabc.org/D20457))       |
| Control-channel protobuf (`ClientMessage` / `ServerMessage`)   | This slice — encode/decode + framed hello; no round driver yet |
| Coordinator + client round RPCs over the wire                  | Not yet                                                        |
| Chronik sync / signing / broadcast                             | Not yet                                                        |
| Covert channel + Tor                                           | Later roadmap                                                  |

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

## Operator checklist (future CLI)

When server/client CLIs land, expect roughly:

1. **One coordinator** bound on `0.0.0.0:8788` (optional TLS for public hosts).
2. **N participant hosts**, each with a **unique** mnemonic, same target
   `tokenId`, overlapping atom tiers, and enough XEC for fees/dust.
3. Participants run in **loop / continuous** mode (not one-shot exit) so pools
   refill after each fusion.
4. Outbound HTTPS to Chronik from every participant (and from the coordinator
   for broadcast).

Until that wiring exists, treat this file as the contract for follow-up diffs:
network + wallet `runOnce` implementations must preserve the continuous-loop
delays and stop/abort behavior already covered by unit tests.

## Privacy / ops reminders

- Prefer `DEFAULT_MIN_PLAYERS >= 8` on public coordinators; 2-player rounds
  deanonymize the counterparty.
- `tokenId` remains public in every ALP `SEND`.
- Covert/Tor is required before claiming CashFusion-class network privacy —
  plain TCP control channels are correctness-only.
