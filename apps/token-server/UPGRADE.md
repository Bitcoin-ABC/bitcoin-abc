# token-server upgrade plan

Phased improvements to token-server: configuration, database, image resolution, and upload validation.

## Phase 0 — Replace secrets.ts with dotenv (done)

Move all secrets and connection strings out of committed TypeScript files and into a conventional `.env` file.

### Motivation

- Align with other apps in this repo (`the-overmind`, `metachronik`) that use `DATABASE_URL` and env vars
- Remove the `prebuild` step that copied `secrets.sample.ts` → `secrets.ts` for CI
- Keep secrets out of the TypeScript compile graph

### Environment variables

| Variable              | Required | Description                                                     |
| --------------------- | -------- | --------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`  | yes      | Telegram bot token from @BotFather                              |
| `TELEGRAM_CHANNEL_ID` | yes      | Channel ID for new icon moderation alerts                       |
| `APPROVED_MODS`       | no       | Comma-separated Telegram user IDs allowed to deny/restore icons |
| `DATABASE_URL`        | yes      | Neon PostgreSQL connection string                               |

Copy `env.sample` to `.env` and fill in values before running locally:

```
cp env.sample .env
```

### Files changed

- Added `src/env.ts` — loads and validates env vars
- Added `env.sample` — documented template (committed)
- Added `test/setupEnv.ts` — test defaults so CI does not need a `.env` file
- Removed `secrets.ts` / `secrets.sample.ts` / `scripts/prepSecrets.ts`
- Updated `index.ts`, `src/routes.ts`, `scripts/sendTgIconNotice.ts`
- Updated `README.md`, `package.json`, `.mocharc.js`

### Production migration (Phase 0)

Map existing `secrets.ts` values to env vars:

| secrets.ts                                               | .env                              |
| -------------------------------------------------------- | --------------------------------- |
| `prod.botId`                                             | `TELEGRAM_BOT_TOKEN`              |
| `prod.channelId`                                         | `TELEGRAM_CHANNEL_ID`             |
| `prod.approvedMods`                                      | `APPROVED_MODS` (comma-separated) |
| `mongodb://{username}:{password}@{containerName}:{port}` | `DATABASE_URL` (Phase 1+)         |

Pass env vars to the Docker container, e.g.:

```
docker run ... --env-file .env ...
```

---

## Phase 1 — Replace MongoDB with Neon PostgreSQL (done)

### Schema

```sql
CREATE TABLE IF NOT EXISTS blacklist (
  token_id   TEXT PRIMARY KEY,
  reason     TEXT NOT NULL,
  timestamp  BIGINT NOT NULL,
  added_by   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cashtab_tokens (
  token_id        TEXT PRIMARY KEY,
  minter_address  TEXT NOT NULL,
  token_type      TEXT NOT NULL,
  supply_type     TEXT NOT NULL CHECK (supply_type IN ('FIXED', 'VARIABLE')),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`blacklist` is unchanged in purpose. `cashtab_tokens` tracks tokens with icons served by token-server. Blacklist status stays on `blacklist` (join on `token_id` when needed).

### `cashtab_tokens` data flow

- **New tokens:** Cashtab `POST /new` includes `minterAddress`, `tokenType`, and `supplyType` with the icon upload. token-server validates the minter address (`ecashaddrjs`), `tokenType`, and `supplyType`, then upserts a row after the icon files are written.
- **Manual add:** `pnpm exec tsx scripts/addCashtabToken.ts <tokenId>` fetches metadata from Chronik and inserts if missing (`chronik-client` is a devDependency; not used at runtime).
- **`is_verified`:** Reserved for future use; defaults to `false`.

### Files changed

- Added `schema.sql`, `test/testDb.ts` (pg-mem helper)
- Rewrote `src/db.ts` for `pg` `Pool`
- Added `src/cashtabTokens.ts` — `upsertCashtabToken()` on `POST /new`
- Replaced `MONGODB_URL` with `DATABASE_URL` in `env.sample` / `src/env.ts`
- Migrated tests to `pg-mem`
- Added `scripts/migrateBlacklistFromMongo.ts` for prod data import
- Removed `mongodb`, `mongodb-memory-server`, Mongo config from `config.ts`

### Production cutover (done)

1. Export live prod blacklist (includes Telegram-added entries, not just seed data).

**From the live API** (no Mongo required; same URL as Cashtab):

```
cd apps/token-server
pnpm exec tsx scripts/exportBlacklistFromApi.ts blacklist.json
```

Uses `https://etokens.cash` by default. Override with `TOKEN_SERVER_URL=http://localhost:3333` for local.

**Or from Mongo** (on the prod host, inside the Docker network):

```
mongoexport --uri="$MONGODB_URL" --db=tokenServerDb --collection=blacklist --out=blacklist.json --jsonArray
```

2. Create Neon project, set `DATABASE_URL` in deploy env
3. Import (with `blacklist.json` in `apps/token-server/`):

```
DATABASE_URL='postgresql://...?sslmode=require' pnpm exec tsx scripts/migrateBlacklistFromMongo.ts
```

4. Deploy token-server with `DATABASE_URL`; verify `GET /blacklist`
5. Decommission Mongo sidecar

---

## Phase 2 — Support 1024×1024 icons (deferred)

Nice-to-have; not required for the PostgreSQL or signature-validation upgrades.

### Work items

1. Add `1024` to `config.iconSizes`
2. Create `token-icons/1024` and `rejected/1024` on prod filesystem
3. Review `config.maxUploadSize` for larger PNG uploads
4. No database changes

---

## Phase 3 — Validate icon uploads with genesis-address signature (done)

Require a signed message from the token genesis address (`minterAddress`) on `POST /new`. Cashtab signs with `ecash-lib` `signMsg`; token-server verifies with `verifyMsg`.

### Signed message format

Cashtab signs the sha256 hex hash of the uploaded PNG bytes (the same hash shown as the token document hash in the create form). token-server hashes `req.file.buffer` before sharp processing and verifies the signature against `minterAddress`.

The signature is base64 (same format as Cashtab Sign/Verify Message) and sent as form field `signature`.

### Files changed

- Added `src/iconAuth.ts` — `hashTokenIcon()` and `verifyTokenIconUploadSignature()`
- Updated `src/routes.ts` — require and verify `signature` on `POST /new`
- Updated `cashtab/.../CreateTokenForm/index.tsx` — sign icon hash and submit `signature`
- Added `ecash-lib` dependency to token-server

### Production deployment (Phase 3)

Deploy token-server and Cashtab together. Uploads without a valid genesis-address signature are rejected with HTTP 403.

---

## Recommended order

1. **Phase 0** — dotenv (done)
2. **Phase 1** — PostgreSQL (done)
3. **Phase 3** — signed uploads (done)
4. **Phase 2** — 1024 icons (deferred, nice-to-have)
