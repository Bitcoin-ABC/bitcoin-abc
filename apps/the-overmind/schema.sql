-- Copyright (c) 2025 The Bitcoin developers
-- Distributed under the MIT software license, see the accompanying
-- file COPYING or http://www.opensource.org/licenses/mit-license.php.

-- Schema for The Overmind
-- Stores user Telegram IDs and their associated wallet addresses with HD derivation indices

-- Table: users
-- Maps Telegram user IDs to their wallet addresses and HD derivation indices
CREATE TABLE IF NOT EXISTS users (
  -- Unique Telegram user ID
  user_tg_id BIGINT PRIMARY KEY,
  -- eCash address of a registered user
  address TEXT NOT NULL,
  -- HD derivation index of a registered user, so we do not need to store the private key
  hd_index INTEGER NOT NULL,
  -- Telegram username (@ handle), nullable since not all users have one
  username TEXT
);

-- Index on address for reverse lookups
CREATE INDEX IF NOT EXISTS idx_users_address ON users (address);

-- Index on hd_index for sequential queries
CREATE INDEX IF NOT EXISTS idx_users_hd_index ON users (hd_index);
