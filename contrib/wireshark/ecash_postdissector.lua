--[[
  eCash Avalanche — Wireshark Lua post-dissector
  Display filter: ecash

  Supported messages:
    - avapoll
    - avaresponse
]]

local proto_ecash = Proto("ecash", "eCash")

local f_round_poll = ProtoField.uint64("ecash.avapoll.round", "Round", base.DEC)
local inv_type_strings = {
  [0]          = "Error",
  [1]          = "TX",
  [2]          = "Block",
  [3]          = "filtered Block",
  [4]          = "CompactBlock",
  [0x1f000001] = "avalanche proof",
  [0x1f000002] = "avalanche stake contender",
}
local f_inv_type = ProtoField.uint32("ecash.avapoll.inv_type", "Inv type", base.DEC, inv_type_strings)
local f_inv_hash = ProtoField.bytes("ecash.avapoll.inv_hash", "Hash")

local f_round_resp = ProtoField.uint64("ecash.avaresponse.round", "Round", base.DEC)
local f_cooldown = ProtoField.uint32("ecash.avaresponse.cooldown", "Cooldown", base.DEC)
local f_burst = ProtoField.int32("ecash.avaresponse.burst_counter", "Burst counter", base.DEC)
local f_vote_error = ProtoField.int32("ecash.avaresponse.vote_error", "Vote error", base.DEC)
local f_vote_hash = ProtoField.bytes("ecash.avaresponse.vote_hash", "Vote hash")

proto_ecash.fields = {
  f_round_poll, f_inv_type, f_inv_hash,
  f_round_resp, f_cooldown, f_burst, f_vote_error, f_vote_hash,
}

local HEADER_LEN = 24
local CMD_AVAPOLL = "avapoll"
local CMD_AVARESPONSE = "avaresponse"

local MAGICS = {
  { "mainnet", { 0xd9, 0xb4, 0xbe, 0xf9 } },
  { "testnet", { 0x0b, 0x11, 0x09, 0x07 } },
  { "regtest", { 0xda, 0xb5, 0xbf, 0xfa } },
}

local function byte_at(tvb, off)
  return tvb:bytes(off, 1):get_index(0)
end

local function is_magic_at(tvb, off, magic)
  return byte_at(tvb, off) == magic[1]
    and byte_at(tvb, off + 1) == magic[2]
    and byte_at(tvb, off + 2) == magic[3]
    and byte_at(tvb, off + 3) == magic[4]
end

local function find_magic(tvb, start_pos)
  local len = tvb:len()
  if start_pos + 4 > len then
    return nil
  end
  local pos = start_pos
  while pos <= len - 4 do
    for _, entry in ipairs(MAGICS) do
      if is_magic_at(tvb, pos, entry[2]) then
        return pos
      end
    end
    pos = pos + 1
  end
  return nil
end

local function read_compact_size(tvb, abs_off)
  local b = byte_at(tvb, abs_off)
  local off = abs_off + 1
  local n
  if b < 253 then
    n = b
  elseif b == 253 then
    n = tvb(off, 2):le_uint()
    off = off + 2
  elseif b == 254 then
    n = tvb(off, 4):le_uint()
    off = off + 4
  else
    local lo = tvb(off, 4):le_uint()
    local hi = tvb(off + 4, 4):le_uint()
    n = lo + hi * 4294967296
    off = off + 8
  end
  return n, off
end

local function hex32(tvb, off)
  local t = {}
  for i = 0, 31 do
    t[#t + 1] = string.format("%02x", byte_at(tvb, off + i))
  end
  return table.concat(t)
end

local function cmd12(tvb, off)
  local parts = {}
  for i = 0, 11 do
    local byte = byte_at(tvb, off + i)
    if byte == 0 then
      break
    end
    parts[#parts + 1] = string.char(byte)
  end
  return table.concat(parts)
end

function proto_ecash.dissector(tvb, pinfo, tree)
  local len = tvb:len()
  if len < HEADER_LEN then
    return
  end

  local pos = 0
  while pos <= len - HEADER_LEN do
    pos = find_magic(tvb, pos)
    if pos == nil then
      break
    end

    local cmd = cmd12(tvb, pos + 4)
    local payload_len = tvb(pos + 16, 4):le_uint()
    local payload_start = pos + HEADER_LEN
    local total_len = HEADER_LEN + payload_len

    if payload_len > 0x02000000 or payload_start + payload_len > len then
      pos = pos + 1
    elseif cmd == CMD_AVAPOLL then
      local st = tree:add(proto_ecash, tvb(pos, total_len), "eCash Avalanche: avapoll")
      st:add_le(f_round_poll, tvb(payload_start, 8))
      local n, off = read_compact_size(tvb, payload_start + 8)
      st:add(tvb(payload_start + 8, off - payload_start - 8), "Inventory count: " .. tostring(n))
      for i = 1, n do
        if off + 36 > payload_start + payload_len then break end
        local inv = st:add(tvb(off, 36), "Inventory[" .. i .. "]")
        inv:add_le(f_inv_type, tvb(off, 4))
        inv:add(f_inv_hash, tvb(off + 4, 32)):append_text(" (" .. hex32(tvb, off + 4) .. ")")
        off = off + 36
      end
      pinfo.cols.info:set("eCash: avapoll")
      pos = pos + total_len
    elseif cmd == CMD_AVARESPONSE and payload_len >= 16 then
      local st = tree:add(proto_ecash, tvb(pos, total_len), "eCash Avalanche: avaresponse")
      st:add_le(f_round_resp, tvb(payload_start, 8))
      st:add_le(f_cooldown, tvb(payload_start + 8, 4))
      st:add_le(f_burst, tvb(payload_start + 12, 4))
      local n, off = read_compact_size(tvb, payload_start + 16)
      st:add(tvb(payload_start + 16, off - payload_start - 16), "Vote count: " .. tostring(n))
      for i = 1, n do
        if off + 36 > payload_start + payload_len then break end
        local v = st:add(tvb(off, 36), "Vote[" .. i .. "]")
        v:add_le(f_vote_error, tvb(off, 4))
        v:add(f_vote_hash, tvb(off + 4, 32)):append_text(" (" .. hex32(tvb, off + 4) .. ")")
        off = off + 36
      end
      pinfo.cols.info:set("eCash: avaresponse")
      pos = pos + total_len
    else
      pos = pos + 1
    end
  end
end

register_postdissector(proto_ecash)
