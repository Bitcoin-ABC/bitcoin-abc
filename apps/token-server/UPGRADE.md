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
| `MONGODB_URL`         | yes      | MongoDB connection string (removed in Phase 1)                  |

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
| `mongodb://{username}:{password}@{containerName}:{port}` | `MONGODB_URL`                     |

Pass env vars to the Docker container, e.g.:

```
docker run ... --env-file .env ...
```

---

## Phase 1 — Replace MongoDB with Neon PostgreSQL

### Current state

MongoDB stores a single `blacklist` collection (`tokenServerDb.blacklist`):

| Field       | Type                 | Notes                        |
| ----------- | -------------------- | ---------------------------- |
| `tokenId`   | string (64-char hex) | Unique                       |
| `reason`    | string               |                              |
| `timestamp` | number               | Unix seconds                 |
| `addedBy`   | string               | Telegram username or user id |

DB access is isolated in `src/db.ts` (5 functions). Icons remain on the filesystem.

### Target state

Follow the `the-overmind` pattern:

- `pg` `Pool` with `DATABASE_URL` (Neon connection string, SSL enabled)
- `schema.sql` applied at startup
- Tests via `pg-mem`

### Proposed schema

```sql
CREATE TABLE IF NOT EXISTS blacklist (
  token_id   TEXT PRIMARY KEY,
  reason     TEXT NOT NULL,
  timestamp  BIGINT NOT NULL,
  added_by   TEXT NOT NULL
);
```

### Work items

1. Add `pg`, `@types/pg`, `pg-mem`; remove `mongodb`, `mongodb-memory-server`
2. Add `schema.sql`
3. Rewrite `src/db.ts` for SQL queries via `Pool`
4. Replace `MONGODB_URL` with `DATABASE_URL` in `env.sample` / `src/env.ts`
5. Migrate tests from `mongodb-memory-server` to `pg-mem`
6. One-off script to export prod Mongo blacklist and import into Neon
7. Deploy with `DATABASE_URL`; decommission Mongo sidecar

### Data migration

Export live prod blacklist (not just the 15 seed entries in code), load into Neon, verify `GET /blacklist` matches before cutover.

Estimated effort: ~1.5 days.

---

## Phase 2 — Support 1024×1024 icons

### Work items

1. Add `1024` to `config.iconSizes`
2. Create `token-icons/1024` and `rejected/1024` on prod filesystem
3. Review `config.maxUploadSize` for larger PNG uploads
4. No database changes

---

## Phase 3 — Validate icon uploads with genesis-address signature

### Work items

1. Require a signed message from the token genesis address on `POST /new`
2. Verify signature with `ecash-lib` (or existing Cashtab signing conventions)
3. Update Cashtab (and any other upload clients) to include the signature
4. Optional: store auth metadata in Postgres if needed later

---

## Recommended order

1. **Phase 0** — dotenv
2. **Phase 1** — PostgreSQL
3. **Phase 2** — 1024 icons
4. **Phase 3** — signed uploads
