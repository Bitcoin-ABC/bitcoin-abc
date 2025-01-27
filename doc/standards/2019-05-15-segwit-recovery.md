---
layout: specification
title: 2019-MAY-15 Segwit Recovery Specification
date: 2019-05-13
category: spec
activation: 1557921600
version: 0.4
---

Segwit Recovery Specification
===============================================

## Motivation
Prior to the [November 2018 upgrade](2018-nov-upgrade.md), miners were able to recover coins accidentally sent to segwit pay-to-script-hash [(P2SH)](https://github.com/bitcoin/bips/blob/master/bip-0016.mediawiki) addresses. These P2SH addresses have a two-push redeem script that contains no signature checks, and they were thus spendable by any miner (though not spendable by normal users due to relay rules). In practice, such coins were sometimes recovered by the intended recipient with the help of miners, and sometimes recovered by anonymous miners who simply decided to assert ownership of these anyone-can-spend coins.

In November 2018, the CLEANSTACK consensus rule was activated, with the intent of reducing malleability mechanisms. This had the unfortunate side effect of also making these segwit scripts *unspendable*, since attempting to spend these coins would always leave two items on the stack.

Starting in May 2019, transactions spending segwit P2SH coins will be allowed once again to be included in blocks.

## Specification
A transaction input
1. that spends a P2SH coin (scriptPubKey=`OP_HASH160 <hash160 of the redeem script> OP_EQUAL`); and
2. where the scriptSig only pushes one item onto the stack: a redeem script that correctly hashes to the value in the scriptPubKey; and
3. where the redeem script is a witness program;

shall be considered valid under the consensus rules to be activated in May 2019.

A witness program has a 1-byte push opcode (for a number between 0 and 16, inclusive) followed by a data push between 2 and 40 bytes (inclusive), both in minimal form.
Equivalently, a witness program can be identified by examining the length and the first two bytes of the redeem script:
* The redeem script byte-length is at least 4 and at most 42.
* The first byte is 0x00, or in the range 0x51 – 0x60. (OP_0, or OP_1 – OP_16).
* The second byte is equal to to the redeem script byte-length, minus two.

All witness-like scripts will be considered valid, even if their execution would normally result in an invalid transaction (e.g. due to a zero value on the stack). Note that because the witness program contains only push operations (among other restrictions), the P2SH script matching the provided hash is the only meaningful validation criteria. The only consequence of this specification is that an intentionally unspendable script resembling a witness program may now be spendable.

This exemption should not be applied for the acceptance of transactions from network peers (i.e., only to acceptance of new blocks), so that segwit recovery transactions remain non-standard (and thus require a miner's cooperation to perform).

## Test cases

#### Valid segwit recoveries:
    V1) Recovering v0 P2SH-P2WPKH:
        scriptSig: 0x16 0x001491b24bf9f5288532960ac687abb035127b1d28a5
        scriptPubKey: OP_HASH160 0x14 0x17743beb429c55c942d2ec703b98c4d57c2df5c6 OP_EQUAL

    V2) Recovering v0 P2SH-P2WSH:
        scriptSig: 0x22 0x00205a0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f
        scriptPubKey: OP_HASH160 0x14 0x17a6be2f8fe8e94f033e53d17beefda0f3ac4409 OP_EQUAL

    V3) Max allowed version, v16:
        scriptSig: 0x22 0x60205a0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f
        scriptPubKey: OP_HASH160 0x14 0x9b0c7017004d3818b7c833ddb3cb5547a22034d0 OP_EQUAL

    V4) Max allowed length, 42 bytes:
        scriptSig: 0x2a 0x00285a0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f2021222324252627
        scriptPubKey: OP_HASH160 0x14 0xdf7b93f88e83471b479fb219ae90e5b633d6b750 OP_EQUAL

    V5) Min allowed length, 4 bytes:
        scriptSig: 0x04 0x00025a01
        scriptPubKey: OP_HASH160 0x14 0x86123d8e050333a605e434ecf73128d83815b36f OP_EQUAL

    V6) Valid in spite of a false boolean value being left on stack, 0:
        scriptSig: 0x04 0x00020000
        scriptPubKey: OP_HASH160 0x14 0x0e01bcfe7c6f3fd2fd8f81092299369744684733 OP_EQUAL

    V7) Valid in spite of a false boolean value being left on stack, minus 0:
        scriptSig: 0x04 0x00020080
        scriptPubKey: OP_HASH160 0x14 0x10ddc638cb26615f867dad80efacced9e73766bc OP_EQUAL

#### Invalid segwit recoveries:
    I1) Non-P2SH output:
        scriptSig: 0x16 0x001491b24bf9f5288532960ac687abb035127b1d28a5
        scriptPubKey: OP_TRUE

    I2) Redeem script hash does not match P2SH output:
        scriptSig: 0x16 0x001491b24bf9f5288532960ac687abb035127b1d28a5
        scriptPubKey: OP_HASH160 0x14 0x17a6be2f8fe8e94f033e53d17beefda0f3ac4409 OP_EQUAL

    I3) scriptSig pushes two items onto the stack:
        scriptSig: OP_0 0x16 0x001491b24bf9f5288532960ac687abb035127b1d28a5
        scriptPubKey: OP_HASH160 0x14 0x17743beb429c55c942d2ec703b98c4d57c2df5c6 OP_EQUAL

    I4) Invalid witness program, non-minimal push in version field:
        scriptSig: 0x17 0x01001491b24bf9f5288532960ac687abb035127b1d28a5
        scriptPubKey: OP_HASH160 0x14 0x0718743e67c1ef4911e0421f206c5ff81755718e OP_EQUAL

    I5) Invalid witness program, non-minimal push in program field:
        scriptSig: 0x05 0x004c0245aa
        scriptPubKey: OP_HASH160 0x14 0xd3ec673296c7fd7e1a9e53bfc36f414de303e905 OP_EQUAL

    I6) Invalid witness program, too short, 3 bytes:
        scriptSig: 0x03 0x00015a
        scriptPubKey: OP_HASH160 0x14 0x40b6941895022d458de8f4bbfe27f3aaa4fb9a74 OP_EQUAL

    I7) Invalid witness program, too long, 43 bytes:
        scriptSig: 0x2b 0x00295a0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728
        scriptPubKey: OP_HASH160 0x14 0x13aa4fcfd630508e0794dca320cac172c5790aea OP_EQUAL

    I8) Invalid witness program, version -1:
        scriptSig: 0x22 0x4f205a0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f
        scriptPubKey: OP_HASH160 0x14 0x97aa1e96e49ca6d744d7344f649dd9f94bcc35eb OP_EQUAL

    I9) Invalid witness program, version 17:
        scriptSig: 0x23 0x0111205a0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f
        scriptPubKey: OP_HASH160 0x14 0x4b5321beb1c09f593ff3c02be4af21c7f949e101 OP_EQUAL

    I10) Invalid witness program, OP_RESERVED in version field:
         scriptSig: 0x22 0x50205a0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f
         scriptPubKey: OP_HASH160 0x14 0xbe02794ceede051da41b420e88a86fff2802af06 OP_EQUAL

    I11) Invalid witness program, more than 2 stack items:
         scriptSig: 0x23 0x00205a0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f51
         scriptPubKey: OP_HASH160 0x14 0x8eb812176c9e71732584123dd06d3246e659b199 OP_EQUAL
