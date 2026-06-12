-- Copyright (c) 2026 The Bitcoin developers
-- Distributed under the MIT software license, see the accompanying
-- file COPYING or http://www.opensource.org/licenses/mit-license.php.

-- token-server blacklist

CREATE TABLE IF NOT EXISTS blacklist (
  token_id   TEXT PRIMARY KEY,
  reason     TEXT NOT NULL,
  timestamp  BIGINT NOT NULL,
  added_by   TEXT NOT NULL
);

-- Cashtab tokens with icons served by token-server

CREATE TABLE IF NOT EXISTS cashtab_tokens (
  token_id        TEXT PRIMARY KEY,
  minter_address  TEXT NOT NULL,
  token_type      TEXT NOT NULL,
  supply_type     TEXT NOT NULL CHECK (supply_type IN ('FIXED', 'VARIABLE')),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashtab_tokens_minter_address
  ON cashtab_tokens (minter_address);
