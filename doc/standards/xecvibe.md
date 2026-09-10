# XecVibe

On-chain protocol for [xecvibe.com](https://xecvibe.com/) payments opened in
Cashtab via BIP21 `op_return_raw`.

## LOKAD ID

`XECV` = `0x58454356` (4 bytes, ASCII).

## Output layout

Every XecVibe payment is a single OP_RETURN output:

```
OP_RETURN                 (0x6a)
<push 4> 58454356         LOKAD prefix "XECV"
<pushdata>                utf8 memo (1–75 bytes)
```

Cashtab labels txs with this prefix as **XecVibe**.

The memo is a one-time id issued by the XecVibe server. What the payment is
for (login, tip, spray, checkout, etc.) is resolved off-chain by looking up
that memo. The on-chain payload stays the same for those cases.

Rules:

- Exactly one pushdata after the LOKAD. Extra pushes are invalid. Bare
  opcodes (`OP_0`–`OP_16`, etc.) are not a memo push and are invalid.
- Memo must be valid UTF-8, 1–75 bytes. Empty or malformed UTF-8 is
  invalid.
- Typical memo is an opaque server string.

## Examples

Valid payment memo `hello`:

```
6a 04 58454356 05 68656c6c6f
```

`op_return_raw` (without leading `6a`):

```
04584543560568656c6c6f
```

Invalid examples:

| Reason | Example `op_return_raw` (no `6a`) |
| ------ | -------------------------------- |
| Missing memo | `0458454356` |
| Extra push after memo | `04584543560568656c6c6f0b786563766962652e636f6d` |
| Malformed UTF-8 memo | `045845435601ff` |
| Bare opcode instead of memo push | `045845435651` |
