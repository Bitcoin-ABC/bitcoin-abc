---
layout: specification
title: Augmented Ledger Protocol
date: 2025-10-10
category: spec
version: 1.0
author: Tobias Ruck
---

# ALP

The “Augmented Ledger Protocol”, a successor protocol to the great and beautiful [Simple Ledger Protocol](https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md).

This Specification was originally published [here](https://ecashbuilders.notion.site/ALP-a862a4130877448387373b9e6a93dd97).

# Rationale

SLP is an amazing token protocol. It’s used for much more than thought to be possible, e.g. self-minted tokens.

However, it also has some shortcomings:

1. **Reverse endianness**: Everything in Bitcoin uses little endian, except for SLP, which consistently uses big-endian. This is a consistent footgun that SLP devs run into. ALP uses little-endian consistently as Satoshi intended.
2. **Squatty protocol**: SLP takes over the entire OP_RETURN output and leaves no room for other protocols. ALP uses the eMPP protocol to allow for multiple sections of data.
3. **BigNum requirement**: Despite only allowing 64-bit integers, SLP allows overflows, which often requires the usage of big num libraries, making implementations awkward. ALP forbids overflows, allowing the usage of commonly available numbers.
4. **Ghost outputs**: SLP can send tokens to outputs that don’t exist. This adds unnecessary complexity to all developers, as this edge case will have to be handled by indexers and wallets.
5. **Only 1 mint baton**: Sometimes it massively simplifies an implementation if multiple mint batons are allowed. ALP allows this.

## Features of ALP

1. **Multi-token atomic swaps**: Within a single transaction, multiple tokens can be swapped atomically.
2. **Extensible**: Other protocols can append their own pushdata, which allows novel interactions with tokens.
3. **More compact**: Since amounts are only 6 bytes (instead of 9), encoding is more compact and allows for more outputs under the existing 220 byte limit for OP_RETURNs. For example, while SLP only allows 19 outputs at most, ALP can have 29 outputs.
4. **Easier to implement**: Despite having more features, ALP is actually easier to “get right”. By its design, it makes a lot of common SLP bugs impossible e.g. by simply leaving no space between fields. It also allows verifying amounts using only 64-bit integers and removes the requirement for 128-bit/BigNum libraries that SLP has.
5. **Double-precision-floating-point-number-friendly**: Some languages only have double-precision floating point numbers (like JavaScript). In ALP, token amounts can always be represented accurately using those numbers (not in SLP).

## Drawbacks

1. **Multiple tokens per transaction**: While this has a lot of benefits, this also makes writing wallets, explorers etc. more difficult, as instead of having 0 or 1 token IDs per transaction, you can have a list of token IDs.
2. **Non-trivial “coloring” step**: Since a ALP transaction can have many “sections”, each with their own token ID (which is not possible in SLP), indexers will have to implement “coloring”, which might be non-trivial.

# Specification

## Terms

- **Pushdata**: A Script op that pushes data to the stack, here used in OP_RETURN to push encoded “sections”.
- **Token**: Colored input/output, has a token ID, token type, amount and “is mint baton”.
- **Section**: A pushdata that parses as ALP. An ALP tx can have multiple GENESIS/MINT/SEND “sections”. Each section must have a unique token ID, you cannot have multiple sections with the same token ID.
- **Section type**: GENESIS/MINT/SEND.
- **Token ID:** Transaction ID of the GENESIS transaction of a token.
- **Token type**: Currently only one token type, 0 (”Standard”). In the future, we may add more token types to support more differentiated tokens.

## Types

### Token amounts

**All token amounts are encoded using 6 byte (or 48-bit) little-endian numbers.**

It is suggested to use 64-bit integers for intermediate computations.

Double-precision floating point numbers (”doubles”) also represent base token amounts accurately (53-bits mantissa), but care must be taken, because once this is converted to a decimal number, they will no longer be accurate. E.g. the number “0.1” cannot be represented accurately in a floating point number.

### Sizes, indices

**All sizes for lengths of bytearrays/strings/vectors are encoded using a single byte 0-127.**

### Var-sized byte strings

**Byte strings are prefixed with their size.**

## Overview

An ALP transaction is validated in two steps:

1. **Parse & Color**: Parse the pushdata ops in the OP_RETURN as individual ALP sections,  and color each output with a token.
2. **Verify**: Look up the actual amounts of the spent inputs and verify they account for the colored output tokens.

Only if a section successfully passes all 2 steps it is considered valid.

If any of the steps fail for a section, discard that section, but continue processing.

This means that a non-ALP pushdata may precede or interleave valid ALP sections.

An exception to this are new/unknown token types, they must be ordered in ascending order, i.e. all sections with token type 0 must be before sections with (hypothetical) token type 1. If a section with token type 0 would come after a section with token type 1, the section with token type 0 should be discarded even if otherwise valid.

Developers should ensure that sections with new token types are always placed *after* the sections with already existing token types.

## Step 1: 📝 Parse

If parsing fails, the section should be discarded, but processing of following sections should continue normally.

### 1.1: eMPP

First, parse the first output as OP_RETURN with the eMPP protocol. If parsing according to eMPP fails, the entire transaction should be discarded, even if parsing partially succeeded.

[eCash: Multi Pushdata Protocol](./empp.md)

Then, parse each eMPP pushdata as a ALP section.

### 1.2: LokadID

Each section must start with the LokadID “SLP2”. 

Otherwise, the processed section is considered “not ALP”, and should be discarded.

### 1.3: Read token type

At the time of writing, the only known token type is “0” (single byte).

Any other token type should be considered “unknown”. Sections with known token type that follow a section with unknown token type should be discarded even if their token type is known and the section is otherwise valid.

A section with unknown section type will color all currently uncolored outputs as “unknown” so wallets don’t accidentally burn new kinds of tokens.

### 1.4: Read section type

The valid section types are:

1. “**GENESIS”**: Create a new token
2. “**MINT”**: Mint more tokens of an existing type
3. “**SEND”**: Send existing tokens between addresses 

**See “Section types” for details on how these are encoded.**

**GENESIS must be the first pushdata, if it is present.** Any GENESIS section that’s not the first pushdata should be discarded.

If the section type is unknown, discard that section and continue processing normally. An unknown section type doesn’t influence following sections (unlike an unknown token type).

Note: This implies that new section types for token type 0 cannot color outputs. Currently envisioned section types (BURN, COMMIT, INVALIDATE) don’t color outputs and therefore this is not an issue. If new coloring section types are needed, a new token type should be introduced.

## Step 2: 🎨 Color

### 2.1: Initialize each input and output as “no token”

Allocate a list of empty tokens for every input and output.

### 2.2: Iterate sections in order, and color outputs

1. **If the section has an unknown token type, color all uncolored outputs as “unknown” with no token ID (e.g. 000…000).**
2. **If the section type is GENESIS, verify the section is the first pushdata.**
3. **Verify the section’s token ID hasn’t been used in a previous section.**
4. **Verify that there’s sufficient outputs for the coloring.** A section may try to color an output that doesn’t exist, in which case the entire section should be discarded.
5. **Verify that coloring the section will have no overlap**, i.e. no output will be colored twice. Any zero token amounts should be ignored during this step.
6. **Color all outputs of the section, ignoring zero token amounts.** **See “Section types” for how outputs are colored.**

## Step 3: 🧐 Verify

### 3.1: Look up all tokens of the spent inputs

This is implementation defined, and for blocks, this might require sorting transactions topologically.

### 3.2: Verify number of tx inputs is less than 32768 (2¹⁵)

**If there are 32768 transaction inputs or more (whether ALP or not), fail verification and burn all tokens.**

This is to prevent a theoretical integer overflow. Note that in practice this cannot happen, as a transaction with 32768 would exceed the 1MB transaction size (see `MAX_TX_SIZE` in src/consensus/consensus.h in Bitcoin ABC). However, we don’t want this spec to depend on external variables, so indexers should check this limit.

### 3.3: Iterate sections and verify there are sufficient input tokens

Verify for SEND sections that **∑ inputs ≥ ∑ outputs**, i.e. that the sum of the tokens of the inputs with the section’s token ID are greater than or equal than the sum of the output tokens with the section’s token ID.

Verify for MINT sections that **there is a mint baton in the inputs with the required token ID**.

# Section types

## MintData encoding

Both GENESIS and MINT use the same structure for the mint data:

| Field | Size/Range | Type | Description |
| --- | --- | --- | --- |
| num mint amounts | 1 byte, 0 to 127 | integer | Number of outputs that receive new tokens. |
| mint amount 1 | 6 bytes, little endian | integer | New tokens to mint to this output, in base tokens. |
| mint amount 2 | 6 bytes, little endian | integer | … |
| … | 6 bytes, little endian | integer | … |
| mint amount N | 6 bytes, little endian | integer | … |
| num mint batons | 1 byte, 0 to 127 | integer | How many mint batons to create in the outputs. |

## GENESIS

A GENESIS section 

### GENESIS section encoding

| Field | Size/Range | Type | Description |
| --- | --- | --- | --- |
| lokad id: ‘SLP2’ | 4 bytes | bytes | Unique eMPP LokadID pushdata header. Note: Unlike SLPv1, this is exactly just 4 bytes with no size prefix. |
| token type: 0 | 1 byte | integer | Single byte token type, standard is 0. |
| tx type: ‘GENESIS’ | 1 var-size + 7 bytes | bytes | Var-sized string ‘GENESIS’. The var size allows parsers to parse unknown new tx types gracefully. |
| token_ticker | 0 to 127 var-sized | string | Token ticker, as in SLPv1 |
| token_name | 0 to 127 var-sized | string | Token name, as in SLPv1 |
| url | 0 to 127 var-sized | string | URL, as document_url in SLPv1 |
| data | 0 to 127 var-sized | bytes | Arbitrary payload. This doesn’t exist in SLPv1. |
| auth_pubkey | 0 to 127 var-sized | bytes | Pubkey, allows signing commitments by the issuer. |
| decimals | 1 byte, 0 to 9 | integer | Decimal places of token quantities, as in SLPv1. |
| num mint amounts | 1 byte, 0 to 127 | integer | Number of outputs that receive new tokens. |
| mint amount 1 | 6 bytes, little endian | integer | New tokens to mint to this output, in base tokens. |
| mint amount 2 | 6 bytes, little endian | integer | … |
| … | 6 bytes, little endian | integer | … |
| mint amount N | 6 bytes, little endian | integer | … |
| num mint batons | 1 byte, 0 to 127 | integer | How many mint batons to create in the outputs. |

### GENESIS section coloring

**Outputs**

| output index | Colored tokens |
| --- | --- |
| 0 |  |
| 1 | <mint amount 1> |
| 2 | <mint amount 2> |
| … | … |
| <num mint amounts> | <mint amount N> |
| <num mint amounts + 1> | mint baton |
| <num mint amounts + 2> | mint baton |
| … | mint baton |
| <num mint amounts + num mint batons> | mint baton |

## MINT

### MINT section encoding

| Field | Size/Range | Type | Description |
| --- | --- | --- | --- |
| lokad id: ‘SLP2’ | 4 bytes | bytes | Unique eMPP LokadID pushdata header. Note: Unlike SLPv1, this is exactly just 4 bytes with no size prefix. |
| token type: 0 | 1 byte | integer | Single byte token type, standard is 0. |
| tx type: ‘MINT’ | 1 var-size + 4 bytes | bytes | Var-sized string ‘MINT’. |
| token_ticker | 0 to 127 var-sized | string | Token ticker, as in SLPv1 |
| token ID | 32 bytes, little endian | bytes | Which token ID to send. Note: Unlike SLPv1, this is little endian just like txids in the Bitcoin protocol. |
| num mint amounts | 1 byte, 0 to 127 | integer | Number of outputs that receive new tokens. |
| mint amount 1 | 6 bytes, little endian | integer | New tokens to mint to this output, in base tokens. |
| mint amount 2 | 6 bytes, little endian | integer | … |
| … | 6 bytes, little endian | integer | … |
| mint amount N | 6 bytes, little endian | integer | … |
| num mint batons | 1 byte, 0 to 127 | integer | How many mint batons to create in the outputs. |

### MINT section coloring

**Outputs**

| output index | Colored tokens |
| --- | --- |
| 0 |  |
| 1 | <mint amount 1> |
| 2 | <mint amount 2> |
| … | … |
| <num mint amounts> | <mint amount N> |
| <num mint amounts + 1> | mint baton |
| <num mint amounts + 2> | mint baton |
| … | mint baton |
| <num mint amounts + num mint batons> | mint baton |

## SEND

### SEND section encoding

| Field | Size | Type | Description |
| --- | --- | --- | --- |
| lokad id: ‘SLP2’ | 4 bytes | bytes | Unique eMPP pushdata header. |
| token type: 0 | 1 byte | integer | Single byte token type, always 0 for fungible tokens. |
| tx type: ‘SEND’ | 1 var-size + 4 bytes | bytes | Var-sized string ‘SEND’. |
| token ID | 32 bytes, little endian | bytes | Which token ID to send. Note: Unlike SLPv1, this is little endian just like txids in the Bitcoin protocol. |
| num outputs | 1 byte | integer | How many ALP outputs this transaction has |
| output amount 1 | 6 bytes, little endian | integer | How many base tokens are going to output 1 |
| output amount 2 | 6 bytes, little endian | integer | … |
| … | 6 bytes, little endian | integer | … |
| output amount M | 6 bytes, little endian | integer | … |

### SEND section coloring

**Outputs**

| output index | Colored tokens |
| --- | --- |
| 0 |  |
| 1 | <output amount 1> |
| 2 | <output amount 2> |
| … | … |
| <num outputs> | <output amount M> |
| … |  |

# Sample Code

```python
def alp_genesis(
    token_ticker: bytes,
    token_name: bytes,
    url: bytes,
    data: bytes,
    auth_pubkey: bytes,
    decimals: int,
    mint_amounts: List[int],
    num_batons: int,
) -> bytes:
    result = bytearray()
    result.extend(b'SLP2')
    result.append(0)

    result.append(len(b'GENESIS'))
    result.extend(b'GENESIS')

    result.append(len(token_ticker))
    result.extend(token_ticker)

    result.append(len(token_name))
    result.extend(token_name)

    result.append(len(url))
    result.extend(url)

    result.append(len(data))
    result.extend(data)

    result.append(len(auth_pubkey))
    result.extend(auth_pubkey)

    result.append(decimals)

    result.append(len(mint_amounts))
    for amount in mint_amounts:
        result.extend(amount.to_bytes(6, 'little'))

    result.append(num_batons)
    return result

def alp_mint(
    token_id: bytes,
    mint_amounts: List[int],
    num_batons: int,
) -> bytes:
    result = bytearray()
    result.extend(b'SLP2')
    result.append(0)

    result.append(len(b'MINT'))
    result.extend(b'MINT')

    result.extend(token_id)

    result.append(len(mint_amounts))
    for amount in mint_amounts:
        result.extend(amount.to_bytes(6, 'little'))

    result.append(num_batons)

    return result

def alp_send(
    token_id: bytes,
    output_amounts: List[int]
) -> bytes:
    result = bytearray()
    result.extend(b'SLP2')
    result.append(0)

    result.append(len(b'SEND'))
    result.extend(b'SEND')

    result.extend(token_id)

    result.append(len(output_amounts))
    for amount in output_amounts:
        result.extend(amount.to_bytes(6, 'little'))

    return result
```


