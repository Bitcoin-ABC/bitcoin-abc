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
