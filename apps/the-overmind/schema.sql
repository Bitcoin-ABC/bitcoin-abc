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

-- Table: messages
-- Stores messages from the monitored group chat with reaction counts
CREATE TABLE IF NOT EXISTS messages (
  -- Telegram message ID (unique per chat)
  msg_id BIGINT PRIMARY KEY,
  -- Message text content
  message_text TEXT NOT NULL,
  -- Telegram user ID of the message sender
  user_tg_id BIGINT,
  -- Telegram username of the message sender
  username TEXT,
  -- Timestamp when message was sent
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Number of likes (all emoji reactions except thumbs down)
  likes INTEGER NOT NULL DEFAULT 0,
  -- Number of dislikes (thumbs down emoji reactions)
  dislikes INTEGER NOT NULL DEFAULT 0
);

-- Index on sent_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages (sent_at);
