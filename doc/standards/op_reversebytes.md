---
layout: specification
title: OP_REVERSEBYTES Specification
category: spec
date: 2019-05-29
activation: 1589544000
version: 0.2
author: Tobias Ruck
---

OP_REVERSEBYTES
==========

OP_REVERSEBYTES reverses the bytes of the top stackitem.

Rationale
---------

Bitcoin's protocol almost exclusively uses little-endian encoding [8], and Script provides various tools for using integers encoded in little endian, such as `OP_NUM2BIN` and `OP_BIN2NUM` [11]. Using covenants [2], sophisticated smart contracts can be created, and Script already has a great arsenal of arithmetic operators (opcodes 139 to 165) to enforce e.g. how input and output amounts of transactions have to be related.

However, many protocols do not use little endian encoding, and it is by no means clear that one is superior to the other. Both AMQP [12] and Apache Thrift [13], for instance, use big-endian encoding. The Simple Ledger Protocol (SLP) uses big-endian encoding as well [1]. Bitdb, when using the `hN` elements, returns stack items in a format that can be directly interpreted as base16 big-endian encoded numbers, and to use this feature, it has to be possible to encode values as big-endian.

Further, now that oracles using OP_CHECKDATASIG are possible, likely used to retrieve numeric data, it would be unnecessarily limiting to assume all oracles will use little-endian encoding.

Among the mentioned protocols, SLP tokens are likely the most important ones. Various new use cases combining the power of covenants and looping transactions [5] emerge, among them:

* Decentralized exchanges (such as SLP Agora or SLPDEX) [3] [6] [4]
* Donation mintable tokens
* DAOs, which charge a fee for services and distribute revenue proportional to shares [7]
* Native tokens (not yet possible)

Note that values can be converted to big-endian encoding if the size of the encoding is both fixed and not too large. Currently, Script only supports 32-bit integers, and they can be encoded in big-endian using OP_SPLIT, OP_SWAP and OP_CAT:

```
// initial:    // <value>
// convert to little-endian
PUSH 4         // <value> 4
OP_NUM2BIN     // <value 4-byte little endian>

// split into individual bytes
PUSH 1         // <value 4-byte little endian> 1
OP_SPLIT       // <value 1st byte> <value 2nd-4th byte>
PUSH 1         // <value 1st byte> <value 2nd-4th byte> 1
OP_SPLIT       // <value 1st byte> <value 2nd byte> <value 3rd-4th byte>
PUSH 1         // <value 1st byte> <value 2nd byte> <value 3rd-4th byte> 1
OP_SPLIT       // <value 1st byte> <value 2nd byte> <value 3rd byte> <value 4th byte>

// reverse individual bytes and concat
// results in 4-byte big endian
OP_SWAP        // <value 1st byte> <value 2nd byte> <value 4th byte> <value 3rd byte>
OP_CAT         // <value 1st byte> <value 2nd byte> <value 4th, 3rd byte>
OP_SWAP        // <value 1st byte> <value 4th, 3rd byte> <value 2nd byte>
OP_CAT         // <value 1st byte> <value 4th, 3rd, 2nd byte>
OP_SWAP        // <value 4th, 3rd, 2nd byte> <value 1st byte>
OP_CAT         // <value 4-byte big endian>
```

However, if with OP_REVERSEBYTES, this becomes trivial:

```
// convert to bytes
PUSH 4           // <SLP value> 4
OP_NUM2BIN       // <SLP value 4-byte little endian>
OP_REVERSEBYTES  // <SLP value 4-byte big endian>
```

That's 11 bytes (9 operations and 3 pushdata) saved.

There are multiple reasons why the second version would be preferable:

* Covenants and looping scripts usually take the script code of the preimage [9] as input, which means every operation counts twice: Once for the stack item containing the script code, and once for the P2SH script stack item [10]. For a conversion to 8-byte big-endian, this would save 32 bytes per conversion, and if there's, say, three of those conversions in a script, it would already amount to 96 bytes - a non-trivial number of bytes for a transaction.
* The cognitive load of developing scripts using the larger snippet above is increased unnecessarily. Developing scripts, by hand or by using tools such as macros or Spedn, already puts a lot of cognitive load on developers, and errors can be devastating to the community. A prominent example of such a failure is the contentious hard-fork on the Ethereum blockchain that was caused by a bug in The DAO smart contract.
* The first version assumes that Script uses 32-bit numbers, however, once integers with larger width are implemented, the script gets linearly longer (4 bytes/byte) with each additional byte. For 256-bit numbers, it would require a whopping 124 bytes (93 operations and 31 pushdata) to convert to big-endian. As the opcode limit currently is 201, that wouldn't leave much room for other operations. In contrast, `<N> OP_NUM2BIN OP_REVERSEBYTES` always encodes integers as N-byte big-endian number, with a constant script size independent of N.

Also, suppose an oracle returns an ordered list of 1-byte items (e.g. indices), however, if the script requires the bytes to be in the reversed order, then OP_REVERSEBYTES would allow to do this trivially.

### A Note On Signs

For unsigned integers, the behavior is always the expected one: the number will be encoded as unsigned big-endian integer. However, as integers in Script are encoded rather curiously, signed integers might result in unexpected behavior:

`-1 4 OP_NUM2BIN OP_REVERSEBYTES -> {0x80, 0x00, 0x00, 0x01}`

Here, the sign bit is the first bit of the resulting stackitem. Usually, negative numbers are encoded in two's complement, and the number should be `{0xff, 0xff, 0xff, 0xff}`. However, as long as developers are aware of this quite Script specific encoding, there's no issue at hand.

OP_REVERSEBYTES Specification
-----------------------------

This specification uses the same syntax for the stack/stackitems as [11].

### Semantics

`a OP_REVERSEBYTES -> b`.

OP_REVERSEBYTES fails immediately if the stack is empty.

Otherwise, the top stack item is removed from the stack, and a byte-reversed version is pushed onto the stack.

Examples:

* `{} OP_REVERSEBYTES -> {}`
* `{0x01} OP_REVERSEBYTES -> {0x01}`
* `{0x01, 0x02, 0x03, 0x04} OP_REVERSEBYTES -> {0x04, 0x03, 0x02, 0x01}`

### Opcode Number

OP_REVERSEBYTES proposes to use the previously unused opcode with number 188 (0xbc in hex encoding), which comes after the most recently added opcode, `OP_CHECKDATASIGVERIFY`.

### Name

The naming of this opcode turned out to become a bit of a bikeshed. In a previous proposal, this opcode has been named `OP_REVERSE`. After that, it has been renamed to `OP_BSWAP`, as that is a more technically accurate term, which is commonly used for reversing the byteorder of integers [14] [15]. However, after some more consideration, it has been renamed to `OP_ENDIAN_REVERSE` following Boost‘s nomenclature [16], then to `OP_REVERSEENDIAN` and finally to `OP_REVERSEBYTES`, which are both more consistent with Script‘s opcode naming system. However, as, “endian” is usually used for numbers which are a power of two—which isn‘t the case for this opcode—`OP_REVERSEBYTES` is the prefered choice here.

`OP_REVERSEBYTES` is preferable to `OP_BSWAP` because `OP_BSWAP` is lexically very similar to the already existing `OP_SWAP` and would make Script harder to read. Also, while the technical term for the instruction is indeed `bswap`, it isn‘t well known for developers of higher level languages and could thus spark confusion that would be avoided by using the name `OP_REVERSEBYTES`, which is more self-descriptive.

### Activation

The opcode will be activated during the 15th May 2020 hardfork.

### Unit Tests

The following unit tests are used by the ABC implementation of the opcode as of Feb 17th 2020.
- `<item> OP_REVERSEBYTES` fails if 15th May 2020 protocol upgrade is not yet activated.
- `OP_REVERSEBYTES` fails if the stack is empty.
- `{} OP_REVERSEBYTES -> {}`
- `{99} OP_REVERSEBYTES -> {99}`
- `{0xde, 0xad} OP_REVERSEBYTES -> {0xad, 0xde}`
- `{0xde, 0xad, 0xa1} OP_REVERSEBYTES -> {0xa1, 0xad, 0xde}`
- `{0xde, 0xad, 0xbe, 0xef} OP_REVERSEBYTES -> {0xef, 0xbe, 0xad, 0xde}`
- `{0x12, 0x34, 0x56} OP_REVERSEBYTES -> {0x56, 0x34, 0x12}`
- for all n ∈ [0; 520]: `{i mod 256 | i < n} OP_REVERSEBYTES -> {(n - i - 1) mod 256 | i < n}`
- for all n ∈ [0; 520]: `{(if (i < (n + 1) / 2) then (i) else (n - i - 1)) % 256) | i < n} OP_DUP OP_REVERSEBYTES OP_EQUAL -> OP_TRUE`

References
----------

[1] SLP Token specification: https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md

[2] Spending constraints with OP_CHECKDATASIG: https://honest.cash/pein_sama/spending-constraints-with-op_checkdatasig-172

[3] SLP Agora: https://github.com/EyeOfPython/slpagora

[4] Sample SLPDEX transaction: https://blockchair.com/bitcoin-cash/transaction/2e69f47a985673c5a645e20ad09025a0892321f096224679657f98e6152c845c

[5] Let's play chess on the BCH Blockchain: https://tobiasruck.com/content/lets-play-chess-on-bch/

[6] SLPDEX (discontinued): slpdex.cash

[7] DAO: https://en.wikipedia.org/wiki/Decentralized_autonomous_organization

[8] Bitcoin protocol documentation, common structures: https://en.bitcoin.it/wiki/Protocol_documentation#Common_structures

[9] BIP143: https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki

[10] BIP16: https://github.com/bitcoin/bips/blob/master/bip-0016.mediawiki

[11] May 2018, reenabled opcodes: reenabled-opcodes.md

[12] AMQP specification, page 14: http://www.amqp.org/sites/amqp.org/files/amqp.pdf

[13] Apache Thrift binary protocol: https://github.com/apache/thrift/blob/master/doc/specs/thrift-binary-protocol.md

[14] https://docs.rs/bswap/1.0.0/bswap/

[15] https://www.npmjs.com/package/bswap

[16] https://www.boost.org/doc/libs/1_63_0/libs/endian/doc/conversion.html#endian_reverse
