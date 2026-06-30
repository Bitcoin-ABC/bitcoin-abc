# ecash-parse

Shared library for parsing eCash transactions from Chronik and producing human-readable notification copy.

## Purpose

eCash apps historically duplicated the same tx-parsing logic in several places — Cashtab’s `chronik` module, push notification servers, and ad hoc copies of OP_RETURN / EMPP helpers. **ecash-parse** centralizes that behavior in one workspace package so parsing rules stay consistent.

Today it is used by:

- **[Cashtab](../../cashtab/)** — transaction history, in-app toasts, and UI rendering (`chronik` re-exports this library)

The same API can be adopted elsewhere so users see the same labels and messages across products, for example:

- **Push notification servers** — incoming tx notification bodies

- **ecash-herald** — Telegram / social tx summaries
- **Block explorer** — tx detail pages and activity feeds
- **Other eCash apps** — wallets, dashboards, bots

New consumers should depend on `ecash-parse` rather than copying parsing code from Cashtab.

## What it provides

| Export                                   | Role                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `parseTx`                                | Chronik `Tx` + wallet hash(es) → structured `ParsedTx` (direction, amounts, token entries, app actions) |
| `getTxNotificationMsg`                   | `ParsedTx` → short notification string (XEC, tokens, Agora, Cashtab msg, EMPP apps, etc.)               |
| `getEmppAppActions` / `getEmppAppAction` | EMPP stack parsing                                                                                      |
| Types                                    | `ParsedTx`, `XecTxType`, `AppAction`, token entry shapes, …                                             |
| Helpers                                  | `previewAddress`, `toXec`, token amount formatting, LOKAD constants                                     |

All LOKAD prefixes and app-specific constants live under `src/constants/` inside this package — no Cashtab config imports.

## Installation

From the monorepo (workspace):

```json
"ecash-parse": "workspace:^"
```

Build before bundling apps that import the compiled entry (Vite, Node, etc.):

```bash
pnpm --filter ecash-parse run build
```

## Usage

```typescript
import { parseTx, getTxNotificationMsg, XecTxType } from 'ecash-parse';
import type { Tx } from 'chronik-client';

const tx: Tx = await chronik.tx(txid);
const walletHash = '…'; // 20-byte pubkey hash, hex

const parsed = parseTx(tx, [walletHash]);

if (parsed.xecTxType === XecTxType.Received) {
    const body = getTxNotificationMsg(
        parsed,
        fiatPrice, // null if unavailable
        'en-US',
        'USD',
        genesisInfo, // optional, for token tickers/decimals
    );
}
```

Cashtab continues to import from `'chronik'` for backward compatibility; that module re-exports `ecash-parse`.

## Tests

```bash
pnpm --filter ecash-parse test
```

Test fixtures are exported for app-level tests:

```typescript
import { notificationFixtures, parseFixtures } from 'ecash-parse/fixtures';
```

## Development

```bash
cd modules/ecash-parse
pnpm install
pnpm run build
pnpm test
```

CI: `ecash-parse-tests` and dependent jobs (e.g. `cashtab-tests`) build this package before consumers.
