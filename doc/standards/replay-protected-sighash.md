---
layout: specification
title: BUIP-HF Digest for replay protected signature verification across hard forks
category: spec
date: 2017-07-16
activation: 1501590000
version: 1.2
---

## Abstract

This document describes proposed requirements and design for a reusable signing mechanism ensuring replay protection in the event of a chain split. It provides a way for users to create transactions which are invalid on forks lacking support for the mechanism and a fork-specific ID.

The proposed digest algorithm is adapted from BIP143[[1]](#bip143) as it minimizes redundant data hashing in verification, covers the input value by the signature and is already implemented in a wide variety of applications[[2]](#bip143Motivation).

The proposed digest algorithm is used when the `SIGHASH_FORKID` bit is set in the signature's sighash type. The verification of signatures which do not set this bit is not affected.

## Specification

### Activation

The proposed digest algorithm is only used when the `SIGHASH_FORKID` bit in the signature sighash's type is set. It is defined as follows:

````cpp
  // ...
  SIGHASH_SINGLE = 3,
  SIGHASH_FORKID = 0x40,
  SIGHASH_ANYONECANPAY = 0x80,
  // ...
````

In presence of the `SIGHASH_FORKID` flag in the signature's sighash type, the proposed algorithm is used.

Signatures using the `SIGHASH_FORKID` digest method must be rejected before [UAHF](https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/uahf-technical-spec.md) is activated.

In order to ensure proper activation, the reference implementation uses the `SCRIPT_ENABLE_SIGHASH_FORKID` flag when executing `EvalScript` .

### Digest algorithm

The proposed digest algorithm computes the double SHA256 of the serialization of:
1. nVersion of the transaction (4-byte little endian)
2. hashPrevouts (32-byte hash)
3. hashSequence (32-byte hash)
4. outpoint (32-byte hash + 4-byte little endian)
5. scriptCode of the input (serialized as scripts inside CTxOuts)
6. value of the output spent by this input (8-byte little endian)
7. nSequence of the input (4-byte little endian)
8. hashOutputs (32-byte hash)
9. nLocktime of the transaction (4-byte little endian)
10. sighash type of the signature (4-byte little endian)

Items 1, 4, 7 and 9 have the same meaning as in the original algorithm[[3]](#OP_CHECKSIG).

#### hashPrevouts

* If the `ANYONECANPAY` flag is not set, `hashPrevouts` is the double SHA256 of the serialization of all input outpoints;
* Otherwise, `hashPrevouts` is a `uint256` of `0x0000......0000`.

#### hashSequence

* If none of the `ANYONECANPAY`, `SINGLE`, `NONE` sighash type is set, `hashSequence` is the double SHA256 of the serialization of `nSequence` of all inputs;
* Otherwise, `hashSequence` is a `uint256` of `0x0000......0000`.

#### scriptCode

In this section, we call `script` the script being currently executed. This means `redeemScript` in case of P2SH, or the `scriptPubKey` in the general case.

* If the `script` does not contain any `OP_CODESEPARATOR`, the `scriptCode` is the `script` serialized as scripts inside `CTxOut`.
* If the `script` contains any `OP_CODESEPARATOR`, the `scriptCode` is the `script` but removing everything up to and including the last executed `OP_CODESEPARATOR` before the signature checking opcode being executed, serialized as scripts inside `CTxOut`.

Notes:
1. Contrary to the original algorithm, this one does not use `FindAndDelete` to remove the signature from the script.
2. Because of 1, it is not possible to create a valid signature within `redeemScript` or `scriptPubkey` as the signature would be part of the digest. This enforces that the signature is in `sigScript` .
3. In case an opcode that requires signature checking is present in `sigScript`, `script` is effectively `sigScript`. However, for reason similar to 2, it is not possible to provide a valid signature in that case.

#### value

The 8-byte value of the amount of Bitcoin this input contains.

#### hashOutputs

* If the sighash type is neither `SINGLE` nor `NONE`, `hashOutputs` is the double SHA256 of the serialization of all output amounts (8-byte little endian) paired up with their `scriptPubKey` (serialized as scripts inside CTxOuts);
* If sighash type is `SINGLE` and the input index is smaller than the number of outputs, `hashOutputs` is the double SHA256 of the output amount with `scriptPubKey` of the same index as the input;
* Otherwise, `hashOutputs` is a `uint256` of `0x0000......0000`.

Notes:
1. In the original algorithm[[3]](#OP_CHECKSIG), a `uint256` of `0x0000......0001` is committed if the input index for a `SINGLE` signature is greater than or equal to the number of outputs. In this BIP a `0x0000......0000` is committed, without changing the semantics.

#### sighash type

The sighash type is altered to include a 24-bit *fork id* in its most significant bits.

````cpp
  ss << ((GetForkID() << 8) | nHashType);
````

This ensure that the proposed digest algorithm will generate different results on forks using different *fork ids*.

## Implementation

Addition to `SignatureHash` :

````cpp
  if (nHashType & SIGHASH_FORKID) {
    uint256 hashPrevouts;
    uint256 hashSequence;
    uint256 hashOutputs;

    if (!(nHashType & SIGHASH_ANYONECANPAY)) {
      hashPrevouts = GetPrevoutHash(txTo);
    }

    if (!(nHashType & SIGHASH_ANYONECANPAY) &&
        (nHashType & 0x1f) != SIGHASH_SINGLE &&
        (nHashType & 0x1f) != SIGHASH_NONE) {
      hashSequence = GetSequenceHash(txTo);
    }

    if ((nHashType & 0x1f) != SIGHASH_SINGLE &&
        (nHashType & 0x1f) != SIGHASH_NONE) {
      hashOutputs = GetOutputsHash(txTo);
    } else if ((nHashType & 0x1f) == SIGHASH_SINGLE &&
               nIn < txTo.vout.size()) {
      CHashWriter ss(SER_GETHASH, 0);
      ss << txTo.vout[nIn];
      hashOutputs = ss.GetHash();
    }

    CHashWriter ss(SER_GETHASH, 0);
    // Version
    ss << txTo.nVersion;
    // Input prevouts/nSequence (none/all, depending on flags)
    ss << hashPrevouts;
    ss << hashSequence;
    // The input being signed (replacing the scriptSig with scriptCode +
    // amount). The prevout may already be contained in hashPrevout, and the
    // nSequence may already be contain in hashSequence.
    ss << txTo.vin[nIn].prevout;
    ss << static_cast<const CScriptBase &>(scriptCode);
    ss << amount;
    ss << txTo.vin[nIn].nSequence;
    // Outputs (none/one/all, depending on flags)
    ss << hashOutputs;
    // Locktime
    ss << txTo.nLockTime;
    // Sighash type
    ss << ((GetForkId() << 8) | nHashType);
    return ss.GetHash();
  }
````

Computation of midstates:

````cpp
uint256 GetPrevoutHash(const CTransaction &txTo) {
  CHashWriter ss(SER_GETHASH, 0);
  for (unsigned int n = 0; n < txTo.vin.size(); n++) {
    ss << txTo.vin[n].prevout;
  }

  return ss.GetHash();
}

uint256 GetSequenceHash(const CTransaction &txTo) {
  CHashWriter ss(SER_GETHASH, 0);
  for (unsigned int n = 0; n < txTo.vin.size(); n++) {
    ss << txTo.vin[n].nSequence;
  }

  return ss.GetHash();
}

uint256 GetOutputsHash(const CTransaction &txTo) {
  CHashWriter ss(SER_GETHASH, 0);
  for (unsigned int n = 0; n < txTo.vout.size(); n++) {
    ss << txTo.vout[n];
  }

  return ss.GetHash();
}
````

Gating code:

````cpp
  uint32_t nHashType = GetHashType(vchSig);
  if (nHashType & SIGHASH_FORKID) {
    if (!(flags & SCRIPT_ENABLE_SIGHASH_FORKID))
      return set_error(serror, SCRIPT_ERR_ILLEGAL_FORKID);
  } else {
    // Drop the signature in scripts when SIGHASH_FORKID is not used.
    scriptCode.FindAndDelete(CScript(vchSig));
  }
````

## Note

In the UAHF, a `fork id` of 0 is used (see [[4]](#uahfspec) REQ-6-2 NOTE 4), i.e.
the GetForkID() function returns zero.
In that case the code can be simplified to omit the function.

## References

<a name="bip143">[1]</a> https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki

<a name="bip143Motivation">[2]</a> https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki#Motivation

<a name="OP_CHECKSIG">[3]</a> https://en.bitcoin.it/wiki/OP_CHECKSIG

<a name="uahfspec">[4]</a> https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/uahf-technical-spec.md
