# metachronik operational scripts

CLI entrypoints live in `src/scripts/`. This folder documents historic chain
quirks and the repair / health-check tools that deal with them.

## Historic edge cases

The UTXO indexer assumes one row per `(txid, vout)` and that every spend has a
matching create. Bitcoin has a handful of pre-standard quirks that violate those
assumptions. We handle them explicitly so indexing from genesis stays correct.

| Edge case                | Era                    | Symptom without fix                                                   | In-code handling                                                  | One-time repair                           |
| ------------------------ | ---------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| Duplicate coinbase txids | Nov 2010 (~blocks 91k) | +50 BTC balance drift per script                                      | Skip repeat-height creates (`knownDuplicateCoinbases.ts`)         | `pnpm repair-known-drift -- --yes`        |
| Empty-script outputs     | Rare (~2013+)          | `Missing UTXO for spend` at later height                              | Track in `utxos` with `output_script = ''`; no `addresses` credit | `pnpm repair-empty-script-utxos -- --yes` |
| CTOR child-before-parent | Post-Nov 2018          | `Missing UTXO for spend` when child lists before parent in `blockTxs` | Collect all creates before spends per block                       | Code fix only; retry batch (no repair)    |

`pnpm check-indexing` knows about both: duplicate drift is a real failure; empty-script
UTXOs are logged as **orphan UTXOs** and excluded from address-balance comparisons.

---

### 1. Duplicate coinbase txids (pre-BIP34)

There are exactly **two** duplicate txids on Bitcoin (four blocks total). They
are not hash collisions — the coinbase transactions are **byte-identical** in
different blocks from Nov 2010, before BIP34 required block height in coinbase.

| txid                                                               | heights      | subsidy           |
| ------------------------------------------------------------------ | ------------ | ----------------- |
| `e3bf3d07d4b0375638d5f1db5255fe07ba2c4cb067cd81b84ee974b6585fb468` | 91722, 91880 | 50 BTC (5e9 sats) |
| `d5d27987d2a3dfc724e359870c6644b40e497bdc0589a033220fe15429d88599` | 91812, 91842 | 50 BTC (5e9 sats) |

Our `utxos` table uses `PRIMARY KEY (txid, vout)`. The first block wins the row;
`ON CONFLICT DO NOTHING` drops the second insert. Without special handling, the
indexer still credits `balance_sats` on the repeat block → +50 BTC drift per
script (+100 BTC net across both).

**Indexer behavior:** at the repeat height, skip the duplicate create entirely
(no `utxos` row, no balance credit). Constants and skip logic:
`src/services/knownDuplicateCoinbases.ts`.

BIP30 (2012) and BIP34 (activated block 227931) prevent new duplicates.

**If you indexed past ~91k before this fix was deployed:** run
`pnpm repair-known-drift -- --yes` (surgical balance subtraction on the two
known scripts). No reindex required.

---

### 2. Empty-script outputs

Some historic transactions have outputs with **zero-length `outputScript`** (`""`)
and non-zero satoshis. They are not OP_RETURN (`6a…`) and can still be spent
later.

**Example (mainnet):**

| Field         | Value                                                              |
| ------------- | ------------------------------------------------------------------ |
| Creating tx   | `7bd54def72825008b4ca0f4aeff13e6be2c5fe0f23430629a9d484a1ac2a29b8` |
| Create height | 230926 (output vout 0, 4096 sats, empty script)                    |
| Spend height  | 231021                                                             |

Early indexer code skipped creates when `normalizeScriptHex` returned null
(empty or OP_RETURN), but still recorded spends → `Missing UTXO for spend` when
indexing reached the spend block.

**Indexer behavior today:**

- **Create:** insert into `utxos` with `output_script = ''` (orphan UTXO).
- **Balance:** do **not** credit or debit `addresses` for empty-script UTXOs
  (nothing to show on the rich list).
- **OP_RETURN:** still skipped entirely (`6a…` prefix) — unspendable.

Code: `src/services/emptyScriptUtxos.ts`, `collectUtxoEvents` in `chronik.ts`,
`applyUtxoEvents` in `utxoApply.ts`.

**If your committed tip is already past the creating block** (e.g. tip 230956,
spend fails at 231021): the fix in code only applies to newly indexed blocks.
Run the backfill repair, then restart (no `--reindex`):

```bash
pnpm repair-empty-script-utxos              # dry run
pnpm repair-empty-script-utxos -- --yes     # insert missing rows
# optional: --from 0 --to <committed_tip>   # full scan of already-indexed range
```

`check-indexing` reports orphan count separately; a 40 XEC gap between
`SUM(utxos)` and `SUM(addresses)` from one empty-script output is expected, not
drift.

---

## `pnpm check-indexing`

Health gate for block coverage, UTXO supply, address↔UTXO reconcile, and token
holder balances. Use `--quick` during long runs (sampled reconcile).

```bash
pnpm check-indexing
pnpm check-indexing -- --quick
```

Exit `2` = invariant failure.

## `pnpm repair-known-drift`

One-time **surgical DB fix** for the two known pre-BIP34 duplicate coinbase
scripts (see [Historic edge cases §1](#1-duplicate-coinbase-txids-pre-bip34)).
Subtracts the extra 50 BTC balance credit on each script when drift matches the
expected pattern. Dry-run by default; pass `--yes` to apply.

```bash
pnpm repair-known-drift
pnpm repair-known-drift -- --yes
```

After repair, `pnpm check-indexing -- --quick` should pass (until new drift from
other causes).

## `pnpm repair-empty-script-utxos`

Backfills `utxos` rows for historic empty-script outputs (see
[Historic edge cases §2](#2-empty-script-outputs)). Dry-run by default.

```bash
pnpm repair-empty-script-utxos
pnpm repair-empty-script-utxos -- --yes
# optional: --from 200000 --to 231000 --batch-size 100
```

Then restart the indexer (no `--reindex`).

## Reindex vs repair

| Approach                            | When                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| **`pnpm repair-known-drift --yes`** | Current DB already indexed past ~129k; only these 2 scripts drift. Fast, no replay. |
| **Full `--reindex` from genesis**   | Fresh DB, or you want a clean replay with the fix in `applyUtxoEvents`.             |

**Partial reindex from height ~91700 is not supported today:**

- `--reindex` truncates `utxos`, `addresses`, and `blocks` — you must rebuild the
  UTXO set from the beginning.
- `INITIAL_INDEX_START > 0` only works if `utxos` already contains all prevouts
  for spends at that height (snapshot). It does not mean “replay from block N
  after wiping blocks N+”.

So for an existing index at 129k: **repair is the practical fix**. For a new
index: **full reindex from 0** with the known-duplicate skip already in code.

## Token rich list (incremental from current tip)

Token tables are empty until the first ALP/SLP tx (~block 500k). Deploy the
schema and code, then restart without `--reindex`.

- `GET /api/charts/token-rich-list?token_id=<64 hex>&limit=100`
- `GET /api/charts/tokens?limit=100&protocol=SLP|ALP`

DB stores atoms; decimals on the frontend. Mint batons always have 0 atoms, so
the default `min_atoms=1` rich-list filter excludes them; pass
`include_mint_batons=true&min_atoms=0` to include baton rows.
