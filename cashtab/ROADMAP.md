# Cashtab CashFusion Roadmap

Bring CashFusion-class privacy into Cashtab so users can opt in and fuse
without running Electrum-ABC. Android is the delivery surface: once opted in,
the app can run fusion for a **set duration** or a **set number of successful
rounds**, including while backgrounded within OS limits.

This is the **product** roadmap for Cashtab. Protocol / coordinator work lives
in the fusion client stack. Cashtab should consume a shared TS client, not
reimplement the round state machine.

**Scope:** Android only. No iOS, web, or extension support planned.

## End goal

1. User enables Fusion (global and/or per-asset) and chooses a stop condition:
    - fuse for _N_ successful rounds, or
    - fuse for _T_ minutes / until a wall-clock time
2. Cashtab joins public coordinator pool(s), completes rounds, lands outputs on
   **fresh HD change addresses**, and shows status + txids.
3. An opted-in session can continue in the background for the chosen
   duration/count (foreground service / scheduled work), then stop cleanly.
4. Clear copy on what fusion does and does not hide (for ALP: `tokenId` stays
   public; privacy is amount↔address unlinkability within the round).

Desktop/daemon clients and public coordinators remain the **liquidity** side.
Cashtab is the **demand** side. Empty pools make the toggle useless.

---

## Current state (prerequisites already in motion)

| Piece                                                                          | Status                                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `ecash-wallet` HD (`fromMnemonic(..., { hd: true })`, change/receive, signing) | Done in lib                                             |
| `ecash-wallet` gap-limit discovery (`syncAndDiscoverAddresses`)                | Done / landing                                          |
| Cashtab wallet model                                                           | Still **single address** (`m/44'/1899'/0'/0/0` only)    |
| Cashtab ↔ `ecash-wallet`                                                       | Partial (`useWallet` holds a non-HD `Wallet`)           |
| CashFusion (XEC) in Electrum-ABC                                               | Mature reference (autofuse, Tor covert, tiers)          |
| ALP fusion                                                                     | Goal — needs protocol spec and server coordinator       |
| Cashtab Android (Capacitor)                                                    | Shipping; no fusion background work yet                 |
| Biometric lock / secure storage                                                | Present; must be designed around for background signing |

---

## P0 — HD wallets in Cashtab (hard blocker)

Fusion requires many addresses: fresh outputs per round, change reservation,
and avoiding address reuse that undoes privacy.

### Library → app

- [ ] Create active wallets as HD via
      `Wallet.fromMnemonic(mnemonic, chronik, { hd: true })`
- [ ] Persist `receiveIndex` / `changeIndex` (and account) with the stored
      wallet
- [ ] Restore / import: run `syncAndDiscoverAddresses` then persist discovered
      indices
- [ ] Migration path for existing single-address wallets: same mnemonic already
      derives `.../0/0`; treat as HD with indices starting from known usage,
      then gap-scan so historical funds are found. Do not force users to move
      funds to a new seed.

### Cashtab product surface

- [ ] Multi-address Chronik sync and websocket subscriptions (all used receive +
      change scripts, not only `address`)
- [ ] Receive UX: show / rotate receive addresses; gap-limit aware
- [ ] Send / Agora / token flows: change goes to HD change chain via
      `ecash-wallet`
- [ ] Tx history and balances aggregate across HD addresses
- [ ] Extension address-sharing API: define which address is “active receive”
- [ ] Storage schema bump for HD fields; encrypted mnemonic stays as today
- [ ] Tests: create, restore, migrate, send with change, multi-address ws
      updates

**Exit criteria:** A restored Cashtab wallet can receive on index > 0, spend
UTXOs from multiple addresses, and land change on a new change index — with no
fusion code required yet.

---

## P1 — Shared fusion client (Cashtab must not own the protocol)

Extract / package a Capacitor-friendly client so Cashtab Android imports it
like `ecash-agora`.

- [ ] Pure TS fusion client (no Node `net` / `fs` in the public API): round
      state machine, commitments, blind sigs, component build, sign, verify.
      XEC CashFusion path and/or ALP fusion path (ship one first; keep
      adapter-shaped).
- [ ] Transport for Android: TLS over WebSocket (or a TLS TCP gateway) from the
      Capacitor WebView. Raw Node `net.Socket` is not available in the app;
      adapters are feasible and expected — see note below.
- [ ] Wallet adapter interface: select fuseable UTXOs, reserve change
      addresses, sign inputs, report fees. Cashtab implements the adapter on
      top of HD `ecash-wallet`. Client never stores the mnemonic.
- [ ] UTXO locking for in-flight rounds (do not double-spend mid-fusion)
- [ ] Fuel / fee management (XEC for fees and dust; auto-split helpers as
      needed)
- [ ] Post-round verify via Chronik (own outputs received, conservation checks)
- [ ] Round timeouts tolerant of mobile latency; fail clean and rejoin

### Transport adapters on Android — feasible?

Yes. Cashtab Android is a Capacitor WebView: it already speaks HTTPS/WSS to
Chronik and other backends. Fusion needs the same class of channel, not a
desktop Tor stack on day one.

| Approach                                       | Feasible on Android? | Notes                                                              |
| ---------------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| TLS WebSocket to a coordinator gateway         | Yes                  | Best fit for WebView; matches how Cashtab already talks to servers |
| TLS from a small Capacitor native plugin (TCP) | Yes                  | Extra native code; use if WS gateway is undesirable                |
| Node-style raw TCP (`net.Socket`) in JS        | No                   | Not available in the WebView; keep for desktop/daemon clients only |
| Full Tor covert path inside the WebView        | Hard / later         | Do not block shipping on this; Phase B if ever                     |

**Practical plan:** coordinator exposes WSS (or HTTPS upgrade to WS). Shared
client takes a transport interface; Android plugs in `WebSocket`. Desktop
daemons can keep TCP. No need for Cashtab to speak Electrum’s raw fusion TCP
wire from the WebView.

**Exit criteria:** A small non-UI harness in Cashtab Android can complete one
fusion round against a public/staging coordinator using an HD test wallet.

---

## P2 — Coordinators, liquidity, and network privacy

Cashtab only ships fusion if pools exist and the wire path is safe enough.

- [ ] Public coordinator list (defaults in Cashtab config; user override)
- [ ] Continuous desktop/daemon clients (keep pools warm — outside Cashtab, but
      blocking for product usefulness)
- [ ] Pool status API / messages (“N/M waiting in this tier”) for UX
- [ ] TLS on control channel before production opt-in
- [ ] Covert channel strategy for mobile. Phase A: correct fusion over TLS
      (accept weaker IP unlinkability). Phase B: Tor or privacy proxy where
      feasible on Android; never block shipping on perfect covert.
- [ ] Fee caps and tier selection policy documented for holders
- [ ] ALP fusion: write protocol spec and stand up server coordinator (goal;
      not a prerequisite for XEC CashFusion in Cashtab if XEC ships first)

**Exit criteria:** Staging + at least one public coordinator; Cashtab can show
live pool fill; traffic is TLS.

---

## P3 — Cashtab Fusion UX (Android)

- [ ] Settings: enable Fusion, asset scope (XEC and/or ALP token allow/deny),
      max fee, stop condition (count / duration)
- [ ] “Fuse now” and “Auto-fuse” entry points (settings + optional home status)
- [ ] Status UI: connecting, waiting for pool, round in progress, success/fail,
      recent fusion txids
- [ ] Privacy education copy (short, accurate; link out for depth)
- [ ] Guardrails: insufficient fuel, dust-only UTXOs, biometric lock engaged,
      no HD wallet yet
- [ ] Do not fuse coins the user is actively spending; pause on send/Agora
      flows
- [ ] Parse / display fusion txs in history (Cashtab + `ecash-parse` already
      know CashFusion prefixes in places — wire through HD multi-address
      history)

**Exit criteria:** Opt-in Android user can complete ≥1 fusion round and see the
result in history.

---

## P4 — Android background fusion (duration / count)

Match the product promise: **opt-in sessions bounded by time or number of
fusions**, not an unbounded daemon.

### Session model

- [ ] `FusionSession` config persisted locally: `enabled`;
      `mode: 'count' | 'duration'`; `maxSuccessfulRounds` and/or `endsAt`; fee
      cap; server selection; asset filters; progress (`completedRounds`,
      `lastError`, `lastTxid`)
- [ ] Stop automatically when count or duration hits; user can stop anytime
- [ ] On app update / crash: session resumes only if still within bounds and
      user has not disabled fusion

### Android execution

- [ ] Capacitor plugin (or community plugin) wrapping a **foreground service**
      with a clear ongoing notification (“Cashtab is fusing · 2/5 rounds · tap
      to open”) while a session is active. Optional **WorkManager** periodic
      wake for “try to join a pool” when a full always-on socket is not
      justified.
- [ ] Lifecycle: start service when session starts; stop service when session
      completes, fails permanently, or user disables
- [ ] Battery / data: backoff on empty pools; pause on low battery / metered
      network if user preference says so
- [ ] Biometric / lock screen policy: background fusion needs signing keys
      without interactive biometric each round. Define explicit opt-in (“Allow
      fusion while locked”) with security copy. If biometric lock is on and
      background signing is not allowed, require the app unlocked to fuse.
- [ ] Secure storage: service process must read the same encrypted wallet
      material Cashtab already uses; no second plaintext copy of seeds
- [ ] Conflict handling: if user opens Send and spends a reserved UTXO, abort
      that round and refresh locks

**Exit criteria:** User sets “5 fusions” or “30 minutes”, backgrounds the app,
and the session completes or stops on schedule with a notification summary —
without requiring the WebView to stay focused.

---

## P5 — Hardening & product polish

- [ ] Fusion depth / “already fused” heuristics for coin selection
      (Electrum-style) so autofuse prefers less-private coins
- [ ] Rate limits, blame/restart behavior as supported by the protocol client
- [ ] Notifications: round complete, session finished, action required (open
      app)
- [ ] Analytics that never leak addresses, txids of failures tied to identity,
      or seed material (aggregate opt-in events only, if any)
- [ ] Feature flag / staged rollout (Android internal → production)
- [ ] QA matrix: HD migrate, fuse while open, background count, background
      duration, kill app mid-round, airplane mode, biometric on/off
- [ ] Docs in Cashtab README: how to enable, what to expect, what is not
      private

---

## Suggested implementation order

```
P0 HD in Cashtab
    → P1 shared TS client + wallet adapter + WSS transport
        → P2 TLS + public coordinators (+ daemon liquidity in parallel)
            → P3 Android Fusion UX
                → P4 Android bounded background sessions
                    → P5 hardening / polish
```

Do not start P4 until P0–P3 work on a real coordinator. Background work on a
broken or empty pool only burns battery.

---

## Scope split (who owns what)

| Owner                                                                | Work                                                                                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ecash-wallet` / `ecash-lib`                                         | HD correctness, gap discovery, signing, change reservation helpers                                              |
| Fusion client package (CashFusion TS and/or ALP fusion when specced) | Protocol, crypto, transports, coordinator compatibility                                                         |
| Coordinators / ops                                                   | Public servers, TLS, WSS gateway, monitoring, liquidity daemons                                                 |
| **Cashtab (Android)**                                                | HD product migration, settings/UX, wallet adapter, session + foreground service, notifications, history display |

---

## Non-goals

- iOS, web, or browser-extension fusion support
- Guaranteeing Electrum-ABC Tor-grade covert unlinkability on day one in the
  Android WebView
- Always-on fusion with no time/count bound
- Hiding ALP `tokenId` on-chain (impossible with ALP SEND)
- Replacing the need for desktop/daemon liquidity

---

## Open decisions (resolve during P0–P1)

1. **XEC first vs ALP first** — Electrum parity (XEC) vs ALP fusion (needs
   spec + coordinator). Cashtab UX can share session/settings chrome either
   way; the client package may land one asset class first.
2. **Background signing vs biometric lock** — require an explicit “fuse while
   locked” permission, or only fuse when the app has an unlocked session.
3. **Address exported to web apps** — keep returning a single receive address,
   or move to payment-code-like / rotating receive semantics when HD lands.
4. **Notification server** — reuse Cashtab push infra for “pool ready / open
   app” wakes, or rely on foreground service alone for v1.
5. **WSS gateway vs native TLS plugin** — prefer coordinator-side WebSocket
   gateway (less Cashtab native code) unless protocol constraints force raw
   TLS TCP from a Capacitor plugin.
