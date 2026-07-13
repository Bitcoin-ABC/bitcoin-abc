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

|                    | Electrum ABC CashFusion (XEC)                                                | alp-fusion (ALP)                                                                      |
| ------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Asset              | Native XEC only                                                              | One ALP `tokenId` per pool / round                                                    |
| Status             | Production in Electrum ABC (and some third-party wallets)                    | Spec / planned; not in-tree yet                                                       |
| Token UTXOs        | **Excluded** — ALP/SLP coins are frozen out of fusion so they are not burned | **Target** — fuse ALP deliberately with correct `alpSend` coloring                    |
| Coordinator        | Public fusion servers; long-lived desktop/daemon clients keep pools warm     | Same role expected; public coordinators + continuous clients required                 |
| Covert / Tor       | Separate covert channel over Tor                                             | Required before claiming CashFusion-class privacy                                     |
| Crypto sketch      | Blind Schnorr component auth, Pedersen commitments, shuffled multi-party tx  | Same family, extended for token atoms + ALP EMPP `SEND`                               |
| Wallet UX          | Toggle in Electrum; “spend only fused coins”                                 | End goal: Cashtab toggle (+ other wallets via a shared client)                        |
| What stays visible | That XEC moved in a large coinjoin                                           | That a given `tokenId` moved in a fusion; amounts↔addresses obscured inside the round |

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
2. **Protocol primitives** — Pedersen over sats + token atoms, blind Schnorr,
   component hashing; unit tests only.
3. **Tx assembly** — build/validate fused ALP `SEND` + fee/dust rules against
   `ecash-lib` / `ecash-wallet` limits (`ALP_POLICY_MAX_OUTPUTS`, etc.).
4. **Coordinator + one-shot client** — pool match → one round → broadcast;
   integration tests; no Tor yet (correctness first).
5. **Continuous client + deploy notes** — keep pools warm (CashFusion parity).
6. **Covert channel + Tor (or equivalent)** — network unlinkability.
7. **Shared client library** — drop CLI-only assumptions.
8. **Cashtab UX** — toggle, token allowlist, fee caps, foreground rounds;
   opportunistic background where the OS allows.
9. **Hardening** — blame/restart, DoS limits, public coordinator runbooks.
