---
layout: specification
title: 2019-NOV-15 minimal push and minimal number encoding rules
date: 2019-08-11
category: spec
activation: 1573819200
version: 1.0
author: Mark B. Lundeberg
---

# Summary

In the November 2019 upgrade, two new consensus rules are introduced to Bitcoin Cash:
- during script execution, executed push opcodes are restricted to be the minimal form for the resultant stack element.
- during script execution, the decoding of stack elements as numbers are restricted to only allow minimal forms, in most cases.

# Motivation

Third-party malleation is when anyone, such as an uninvolved miner, is able to modify parts of a transaction while keeping it valid, yet changing the transaction identifier. The validity of child transactions is contingent on having the correct transaction identifier for the parent, and so third-party malleability threatens to invalidate chains of transactions, whether they are held in secret, in mempool, or even already confirmed (i.e., during blockchain reorganization). A variety of past consensus rule changes have tried to address third-party malleability vectors: BIP66 strict ECDSA encoding, the ECDSA low-S rule, the strict encoding rule for hashtype, the scriptSig push-only rule, and the cleanstack rule. This effort is incomplete, as there remains a significant malleability vector that means that currently, *all* transactions on BCH are still third-party malleable:

* The push opcodes used during scriptSig execution can be modified. For example, the length-one stack element `{0x81}` can be equivalently pushed using any of the following five script phrases (in hex): `4f`, `0181`, `4c0181`, `4d010081`, `4e0100000081`. A third party can substitute any of these for each other.

For some transactions, an additional malleability mechanism is also present:

* Some smart contracts perform operations on numbers that are taken from the scriptSig, and numbers in bitcoin's Script language are allowed to have multiple representations on stack. The number -1, for example, can be represented by `{0x81}`, `{0x01, 0x80}`, `{0x01, 0x00, 0x80}`, `{0x01, 0x00, 0x00, 0x80}`.

For years now, the "MINIMALDATA" flag, which restricts both of the aforementioned malleability vectors, has been active at the mempool layer of most nodes but not at the consensus layer. The upgrade converts the existing MINIMALDATA rules to consensus. For reference, this document contains a full specification of these rules.

It is of course impossible to completely remove third-party malleability in bitcoin (not even using techniques like SegWit) since a transaction can be made that involves no signature or where the signing key is not a secret, or where permutations are permitted (e.g., [SINGLE|ANYONECANPAY](https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki#specification)). We can, however, remove it for large classes of transactions, and this has been the goal of the past upgrades. Bringing MINIMALDATA to the consensus layer, along with the [dummy element restrictions in the OP_CHECKMULTISIG upgrade](2019-11-15-schnorrmultisig.md), finally achieves the goal of removing third-party malleability from the vast majority of transactions performed on BCH.

# Technical background

**Push opcodes** — Bitcoin's Script system is a stack-based language. The stack elements are simply byte arrays of length 0 to 520. Push opcodes append a byte array onto the stack, and there are a variety of different opcodes for pushing arbitrary data of various lengths, or pushing specific one-byte arrays:
* Opcode 0 (OP_0) pushes an empty element onto the stack.
* Opcodes 1 through to 75 push an arbitrary byte array of the corresponding length onto the stack.
* Opcode 76 (PUSHDATA1) takes a one-byte length as parameter, and then pushes an arbitrary byte-array of that length.
* Opcode 77 (PUSHDATA2) takes a two-byte length as parameter, and then pushes an arbitrary byte-array of that length.
* Opcode 78 (PUSHDATA2) takes a four-byte length as parameter, and then pushes an arbitrary byte-array of that length.
* Opcode 79 (OP_1NEGATE) pushes the one-byte element `{0x81}`.
* Opcode 81 (OP_1) pushes the one-byte element `{0x01}`.
* Opcode 82 (OP_2) pushes the one-byte element `{0x02}`.
* ...
* Opcode 95 (OP_15) pushes the one-byte element `{0x0f}`.
* Opcode 96 (OP_16) pushes the one-byte element `{0x10}`.

It can be seen from the above list that any given byte array can be pushed in a variety of ways. However, for any given byte array there is a unique shortest possible way to push the byte array.

**Number representation** — Although bitcoin's stack is just a sequence of byte arrays, there are numerous Script opcodes that expect to take integers from the stack, which means they decode the byte array to an integer before logically using the integer. The way Script represents numbers as byte arrays is using a variable-length, little-endian [sign-and-magnitude representation](https://en.wikipedia.org/wiki/Signed_number_representations#Signed_magnitude_representation_(SMR)). This is typical for a multiprecision or 'bignum' arithmetic computing environment, but may be unfamiliar for programmers who are used to 'bare-metal' integer computing that uses fixed-width two's complement (or rarely, ones' complement) representation.

Currently, the only consensus restriction is that the byte arrays used during number decoding shall be at most 4 bytes in length (except for four special cases, noted in the specification below). This restricts the range of numbers to be \[-2<sup>31</sup> + 1 ... 2^<sup>31</sup> - 1\] (inclusive), but does not pose any further restrictions on encoding. So, there are various ways to encode a given number as a stack element by padding the number with excess groups of zero bits just before the sign bit. For example, the number -6844 can be represented in three valid ways: `{0xbc, 0x9a}`, `{0xbc, 0x1a, 0x80}`, `{0xbc, 0x1a, 0x00, 0x80}`. The number 39612 can be represented as `{0xbc, 0x9a, 0x00}` or `{0xbc, 0x9a, 0x00, 0x00}`. The number 0 has nine valid representations. While all opcodes that output numbers will minimally encode said output, at the current time they are happy to accept any representation for a numeric input.

For any given number, there is exactly one minimal (shortest) representation. A simple test can be applied to a byte array to see whether it is the minimal encoding of the corresponding number:

* The byte array holds a minimally encoded number if any of the following apply:
  * The byte array has length 0. (this is the minimal representation of the number 0)
  * The byte array has length of 1 or larger, and the the last byte has any bits set besides the high bit (the sign bit).
  * The byte array has length of 2 or larger, and the *second-to-last* byte has its high bit set.
* If none of the above apply, the byte array holds a non-minimal encoding of the given number.

Note that bitcoin's number system treats "negative 0" encodings such as `{0x80}`, `{0x00, 0x80}`, etc. as a representation of 0, and the minimal encoding of 0 is an empty byte array: `{}`. The above rules indicate that neither `{0x80}` nor `{0x00}` are minimal encodings.

# Specification

Though conventionally appearing under one flag "MINIMALDATA", there are two unrelated rules that do not interact. The specifications have been accordingly split into two sections.

## Minimal push rule

Upon the execution of a push opcode (be it during scriptSig, scriptPubKey, or P2SH redeemScript execution), the data pushed on stack shall be examined in order to decide if the just-executed push opcode was minimal:
* An empty stack element `{}` must be pushed using OP_0.
* A one-byte element must be pushed using opcode 1 followed by the given byte, *except* for the following 17 special cases where a special opcode must be used instead:
  * `{0x81}` must be pushed using OP_1NEGATE
  * `{0x01}` must be pushed using OP_1
  * `{0x02}` must be pushed using OP_2
  * ...
  * `{0x0f}` must be pushed using OP_15
  * `{0x10}` must be pushed using OP_16
* An element of length N=2 to length N=75 must be pushed using opcode N.
* An element of length 76 to 255 must be pushed using PUSHDATA1.
* An element of length 256 to 65535 must be pushed using PUSHDATA2.

In practice, PUSHDATA2 can only push lengths up to 520, but in case script is upgraded one day, the limit for PUSHDATA2 remains at 65535. Since the above rules cover all possible stack element lengths, this means that PUSHDATA4 cannot appear in executed parts of scripts (it must still, however, be *parsed* correctly in an unexecuted branch).

It is worth emphasizing that the above rules only apply at the moment when push opcodes are actually *executed*, i.e., when data is actually being placed onto the stack. Thus:
* These rules do *not* apply to push opcodes found in unexecuted branches (those behind OP_IF/OP_NOTIF) of executed scripts.
* These rules do *not* apply to scripts appearing in transaction outputs, as they have not yet been executed.
* These rules do *not* apply to coinbase scriptSigs, which are not executed. Note that BIP34 imposes a (slightly distinct) encoding requirement for the mandatory height push at the start of the coinbase scriptSig.

## Minimal number encoding

Most opcodes that take numbers from the stack shall require the stack element to be a minimally encoded representation. To be specific, these operands must be minimally encoded numbers:
* The single operand of OP_PICK and OP_ROLL.
* The single operand of OP_1ADD, OP_1SUB, OP_NEGATE, OP_ABS, OP_NOT, OP_0NOTEQUAL.
* Both operands of OP_ADD, OP_SUB, OP_DIV, OP_MOD, OP_BOOLAND, OP_BOOLOR, OP_NUMEQUAL, OP_NUMEQUALVERIFY, OP_NUMNOTEQUAL, OP_LESSTHAN, OP_GREATERTHAN, OP_LESSTHANOREQUAL, OP_GREATERTHANOREQUAL, OP_MIN, OP_MAX.
* All three operands of OP_WITHIN.
* The "keys count" and "signatures count" operands of OP_CHECKMULTISIG, OP_CHECKMULTISIGVERIFY.
* The second operand ("position") of OP_SPLIT.
* The second operand ("size") of OP_NUM2BIN, *but not the first (see below)*.
* In general, all number-accepting opcodes added in future will require minimal encoding as well.

However, four opcodes are special in the numeric inputs they accept:

* OP_CHECKLOCKTIMEVERIFY and OP_CHECKSEQUENCEVERIFY both take up to **5-byte** numbers from the stack, a deviation from the usual 4-byte limit. Regardless, we shall require that these 5-byte numbers also be minimally encoded.
* The first operand of OP_NUM2BIN and the single operand of OP_BIN2NUM will continue to have *no minimal encoding restrictions* and *no length restrictions* (see [their specification](may-2018-reenabled-opcodes.md) for more information).

The following opcodes notably do not appear in the above lists since they do *not* decode their inputs as numbers, and thus they have no minimal number encoding rules: OP_IF, OP_NOTIF, OP_VERIFY, OP_IFDUP, OP_AND, OP_OR, OP_XOR.

# Rationale and commentary on design decisions

## Over-restrictions on minimal push

To prevent push malleability, it is only necessary to restrict the scriptSig. The push forms used during scriptPubKey and P2SH redeemScript execution cannot be malleated, since they are committed by hashing into the prior transaction's identifier. Thus it may seem like 'overkill' to restrict these as well.

Despite this, the MINIMALDATA standardness rule has applied these restrictions to scriptPubKey and redeemScript for quite a while now, and it does not appear to be causing an issue. In addition, it is technically cleaner in some ways, if the same script interpretation rules can be applied to all executing scripts.

## Restrictions of number encoding

By far, the most common usage of numbers is in OP_CHECKMULTISIG where they are provided in the locking script and cannot be malleated. Only rare smart contracts take numbers from the scriptSig, and in fact, smart contracts that require minimal number encoding could easily enforce this themselves, by using tricks such as `OP_DUP OP_DUP OP_0 OP_ADD OP_EQUALVERIFY` (taking advantage of the fact that adding 0 to a number returns its minimal encoding), or more recently: `OP_DUP OP_DUP OP_BIN2NUM OP_EQUALVERIFY`.

However, the number encoding rule has been standard for quite some time, and adopting it now should cause no issue. It also makes it so that smart contract authors can save their limited opcodes for more valuable tasks, and need not use such tricks.

## Not restricting boolean encodings

Four opcodes interpret their input as a boolean without any restriction: OP_IF, OP_NOTIF, OP_VERIFY, OP_IFDUP. Any byte array of any length that is all zeros, or that is all zeros besides a final byte of 0x80, is interpreted as 'false', and any other byte array is interpreted as 'true'. The script interpreter also accepts such unrestricted boolean representations for the final stack value used to determine pass/fail of a script.

Two additional 'boolean' opcodes (OP_BOOLAND, OP_BOOLOR) have a semi-restricted input, as they interpret their inputs as numbers. These must be at most 4 bytes long, and as mentioned above they will be restricted according to the number encoding rules. However, while there will be only one valid representation for 'false' (the number 0, i.e., `{}`), any nonzero number can be used as 'true'.

In theory, we could restrict all of these boolean-expecting operations to accept only `{}` for 'false', and `{0x01}` for 'true'; this would be analogous to the number encoding restrictions. However, no such standardness rule exists at this time so it would be too sudden to impose any hard rule for this upgrade.

Also, it is easier for scripts to avoid malleable boolean inputs without having to use up additional opcodes, as demonstrated by the following example. Among smart contracts, it is common to see a construction of a form like `OP_IF pubkey_A OP_CHECKSIGVERIFY <clause 1 conditions> OP_ELSE pubkey_B OP_CHECKSIGVERIFY <clause 2 conditions> OP_ENDIF`. Transactions spending such smart contracts will remain malleable, since the input to OP_IF comes from scriptSig. However, it is easy for script programmers to tweak such smart contracts to a non-malleable form: `pubkey_A OP_CHECKSIG OP_IF <clause 1 conditions> OP_ELSE pubkey_B OP_CHECKSIGVERIFY <clause 2 conditions> OP_ENDIF`. This takes advantage of the fact that OP_CHECKSIG simply returns false if the provided signature is not valid. Due to the already-adopted NULLFAIL rule, `{}` is the only permitted invalid signature, and cannot be malleated.

# Acknowledgements

Thanks to Antony Zegers and Amaury Sechet for valuable feedback.
