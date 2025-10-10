---
layout: specification
title: eCash Multi Pushdata Protocol
date: 2025-10-10
category: spec
version: 1.0
author: Tobias Ruck
---

# eCash: Multi Pushdata Protocol

short: eMPP or “the eMPP Protocol”

This Specification was originally published [here](https://ecashbuilders.notion.site/eCash-Multi-Pushdata-Protocol-11e1b991071c4a77a3e948ba604859ac).

# Rationale

eCash currently only allows one OP_RETURN per transaction. Many current protocols (such as SLP) only allow one protocol to be used per OP_RETURN, so in practice only one protocol per transaction can be used. However, it is useful to allow multiple protocols (aka. “fragments”) per transaction, e.g. to allow receipts to be added to an SLP transaction.

One solution for this has been to allow multiple OP_RETURN outputs, which actually has been activated on Bitcoin Cash in May 2021 (someone double check this). However, this is inefficient for multiple reasons:

1. Wasted bytes: Each input requires another amount and script size. On Bitcoin’s tx format, that’s 9 extra bytes per output.
2. Unnecessary processing by nodes: Nodes will have to parse and process each output seperately, only to then ignore them completely.
3. Bandaid: Bitcoin Cash bumped the number of OP_RETURNs to 3, but keeping the total allowed data bytes per tx on the same level. This only really helps for some very specific cases. E.g. if someone wants to use 4 protocols in one tx, they’re at a loss again.

# Specification

For an OP_RETURN output to be considered “standard”, it can only consist of ops that are considered “Push Ops”. Note that OP_RESERVED (0x50) is considered a push op, but is largely unused for OP_RETURN protocols, which we can use for eMPP.

A valid eMPP tx must have an OP_RETURN output at the first (vout = 0) position. Any OP_RETURN at a position after that should be ignored as invalid.

A valid eMPP script looks like this:

1. OP_RETURN (0x6a)
2. OP_RESERVED (0x50)
3. <pushop0> <pushop1> … <pushopN> (One push op containing the entire payload for each fragment)

Push ops in 3. must be encoded the following way:

1. Any non-push opcode (e.g. OP_CHECKSIG) is invalid in OP_RETURN scripts by eCash policy rules; if it is encountered, the entire OP_RETURN should be ignored as invalid
2. Single-byte push opcodes (i.e. OP_0, OP_RESERVED, OP_1NEGATE, OP_1, …, OP_16) are not supported and the entire OP_RETURN script should be ignored as invalid. 
3. Any pushop pushing the empty string is invalid and the entire OP_RETURN should be ignored as invalid.
4. The payload can be pushed using any of these opcodes:
    1. Opcodes with the number 0x01-0x4b (1 to 75)
    2. OP_PUSHDATA1
    3. OP_PUSHDATA2
    4. OP_PUSHDATA4
5. Unlike data in scriptSig, the opcode doesn’t have to be encoded minimally. All of these are considered valid for pushing the payload 0x77: 0x0177, 0x4c0177, 0x4d010077, 0x4e0100000077.

The payload in each protocol is recommended to have the following format:

1. It should start with a 4 byte LOKAD ID (without any additional encoding, i.e. it is not a pushop)
2. Followed by an arbitrary sequence of bytes, with encoding left up to the protocol
