# Proof of Writing

On-chain protocol for [proofofwriting.com](https://proofofwriting.com/) feed
actions, article publishes, paywall unlocks, wallet-auth logins, handle NFT mint
payments, and article comments.

## LOKAD ID

`POWR` = `0x504f5752` (4 bytes, ASCII).

## Output layout

Every action is a single OP_RETURN output:

```
OP_RETURN                 (0x6a)
<push 4> 504f5752         LOKAD prefix "POWR"
OP_0                      protocol version 0 (bare opcode)
OP_N                      action, bare opcode: OP_1..OP_11 (see table)
[pushdata(s)]             per-action payload, see table
```

`version` and `action` are bare opcodes (`OP_0`, `OP_1`..`OP_11`).

## Actions

| Action  | Opcode | Push 1            | Push 2            | Meaning                          |
| ------- | ------ | ----------------- | ----------------- | -------------------------------- |
| post    | OP_1   | contentHash (32B) | —                 | New feed post                    |
| reply   | OP_2   | targetTxid (32B)  | contentHash (32B) | Reply to a feed post             |
| quote   | OP_3   | targetTxid (32B)  | contentHash (32B) | Quote of a feed post             |
| repost  | OP_4   | targetTxid (32B)  | —                 | Repost of a feed post            |
| like    | OP_5   | targetTxid (32B)  | —                 | Like (tip) of a feed post        |
| publish | OP_6   | contentHash (32B) | —                 | Article published (anchor)       |
| unlock  | OP_7   | —                 | —                 | Article paywall unlock           |
| auth    | OP_8   | nonce (36B)       | —                 | Wallet login challenge payment   |
| handle  | OP_9   | nonce (36B)       | —                 | Handle NFT mint payment          |
| comment | OP_10  | contentHash (32B) | —                 | Article comment (top-level)      |
| creply  | OP_11  | targetTxid (32B)  | contentHash (32B) | Reply to an article comment      |

Notes:

- `targetTxid` and `contentHash` are each a 32-byte pushdata (push opcode `0x20`).
- `nonce` is a 36-byte pushdata (push opcode `0x24`): the ASCII bytes of a
  standard UUID string (server-issued; single-use).
- `contentHash` is sha256 of the stored UTF-8 content.
- `targetTxid` is the referenced transaction (reply/quote/repost/like → the feed
  post; creply → the parent comment).
- `unlock` carries no payload — minimal marker `6a04504f57520057`.
- A reply to a legacy (pre-paid) comment has no parent txid to target, so it is
  emitted as a plain `comment` (OP_10); its thread link lives off-chain.

## Examples

Reply (`OP_2`), target `aaaa…` (32B), hash `bbbb…` (32B):

```
6a 04 504f5752 00 52 20<32B target> 20<32B hash>
```

Unlock (`OP_7`):

```
6a 04 504f5752 00 57
```

Comment (`OP_10`), hash `bbbb…` (32B):

```
6a 04 504f5752 00 5a 20<32B hash>
```
