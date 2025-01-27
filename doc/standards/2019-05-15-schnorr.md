---
layout: specification
title: 2019-MAY-15 Schnorr Signature specification
date: 2019-02-15
category: spec
activation: 1557921600
version: 0.5
author: Mark B. Lundeberg
---

# Summary

Four script opcodes that verify single ECDSA signatures will be overloaded to also accept Schnorr signatures:

* `OP_CHECKSIG`, `OP_CHECKSIGVERIFY`
* `OP_CHECKDATASIG`, `OP_CHECKDATASIGVERIFY`

The other two ECDSA opcodes, `OP_CHECKMULTISIG` and `OP_CHECKMULTISIGVERIFY`, will *not* be upgraded to allow Schnorr signatures and in fact will be modified to refuse Schnorr-sized signatures.

   * [Summary](#summary)
   * [Motivation](#motivation)
   * [Specification](#specification)
      * [Public keys](#public-keys)
      * [Signature verification algorithm](#signature-verification-algorithm)
      * [Message m calculation](#message-m-calculation)
      * [OP_CHECKMULTISIG/VERIFY](#op_checkmultisigverify)
   * [Recommended practices for secure signature generation](#recommended-practices-for-secure-signature-generation)
   * [Rationale and commentary on design decisions](#rationale-and-commentary-on-design-decisions)
      * [Schnorr variant](#schnorr-variant)
      * [Overloading of opcodes](#overloading-of-opcodes)
      * [Re-use of keypair encodings](#re-use-of-keypair-encodings)
      * [Non-inclusion of OP_CHECKMULTISIG](#non-inclusion-of-op_checkmultisig)
      * [Lack of flag byte -- ECDSA / Schnorr ambiguity](#lack-of-flag-byte----ecdsa--schnorr-ambiguity)
      * [Miscellaneous](#miscellaneous)
   * [Acknowledgements](#acknowledgements)

# Motivation

(for more detail, see Motivation and Applications sections of [Pieter Wuille's Schnorr specification](https://github.com/sipa/bips/blob/bip-schnorr/bip-schnorr.mediawiki))

Schnorr signatures have some slightly improved properties over the ECDSA signatures currently used in bitcoin:
* Known cryptographic proof of security.
* Proven that there are no unknown third-party malleability mechanisms.
* Linearity allows some simple multi-party signature aggregation protocols. (compactness / privacy / malleability benefits)
* Possibility to do batch validation, resulting a slight speedup during validation of large transactions or initial block download.

# Specification

Current ECDSA opcodes accept DER signatures (format: `0x30 (N+M+4) 0x02 N <N bytes> 0x02 M <M bytes> [hashtype byte]`) from the stack. This upgrade will allow a Schnorr signature to be substituted in any place where an ECDSA DER signature is accepted. Schnorr signatures taken from stack will have the following 65-byte form for OP_CHECKSIG/VERIFY:

| 32 bytes | 32 bytes | 1 byte      |
|----------|----------|-------------|
| r        | s        | hashtype    |

and 64 bytes for OP_CHECKDATASIG/VERIFY:

| 32 bytes | 32 bytes |
|----------|----------|
| r        | s        |

* `r` is the unsigned big-endian 256-bit encoding of the Schnorr signature's *r* integer.
* `s` is the unsigned big-endian 256-bit encoding of the Schnorr signature's *s* integer.
* `hashtype` informs OP_CHECKSIG/VERIFY [mechanics](replay-protected-sighash.md).

These constant length signatures can be contrasted to ECDSA signatures which have variable length (typically 71-72 bytes but in principle may be as short as 8 bytes).

Upon activation, all 64-byte signatures passed to OP_CHECKDATASIG/VERIFY will be processed as Schnorr signatures, and all 65-byte signatures passed to OP_CHECKSIG/VERIFY will be processed as Schnorr signatures. 65-byte signatures passed to OP_CHECKMULTISIG/VERIFY will trigger script failure (see below for more detailss).

## Public keys

All valid ECDSA public keys are also valid Schnorr public keys: compressed (starting byte 2 or 3) and uncompressed (starting byte 4), see [SEC1 §2.3.3](http://www.secg.org/sec1-v2.pdf#subsubsection.2.3.3). The formerly supported ECDSA hybrid keys (see [X9.62 §4.3.6](citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.202.2977&rep=rep1&type=pdf#page=22)) would also be valid, except that these have already been forbidden by the STRICTENC rule that was activated long ago on BCH.

(Schnorr private keys are also identical to the ECDSA private keys.)

## Signature verification algorithm

We follow essentially what is an older variant of Pieter Wuille's [BIP-Schnorr](https://github.com/sipa/bips/blob/bip-schnorr/bip-schnorr.mediawiki). Notable design choices:

* Operates on secp256k1 curve.
* Uses (*R*,*s*) Schnorr variant, not (*e*,*s*) variant.
* Uses pubkey-prefixing in computing the internal hash.
* The Y coordinate of *R* is dropped, so just its X coordinate, *r*, is serialized. The Y coordinate is uniquely reconstructed from *r* by choosing the quadratic residue.
* Unlike the currently proposed BIP-Schnorr, we use full public keys that do *not* have the Y coordinate removed; this distinction is maintained in the calculation of *e*, below, which makes the resulting signatures from the algorithms incompatible. We do this so that all existing keys can use Schnorr signatures, and both compressed and uncompressed keys are allowed as inputs (though are converted to compressed when calculating *e*).

In detail, the Schnorr signature verification algorithm takes a message byte string `m`, public key point *P*, and nonnegative integers *r*, *s* as inputs, and does the following:

1. Fail if point *P* is not actually on the curve, or if it is the point at infinity.
2. Fail if *r* >= *p*, where *p* is the field size used in secp256k1.
3. Fail if *s* >= *n*, where *n* is the order of the secp256k1 curve.
4. Let `BP` be the 33-byte encoding of *P* as a compressed point.
5. Let `Br` be the 32-byte encoding of *r* as an unsigned big-endian 256-bit integer.
6. Compute integer *e* = *H*(`Br | BP | m`) mod *n*. Here `|` means byte-string concatenation and function *H*() takes the SHA256 hash of its 97-byte input and returns it decoded as a big-endian unsigned integer.
7. Compute elliptic curve point *R*' = *sG* - *eP*, where *G* is the secp256k1 generator point.
8. Fail if *R*' is the point at infinity.
9. Fail if the X coordinate of *R*' is not equal to *r*.
10. Fail if the Jacobi symbol of the Y coordinate of *R*' is not 1.
11. Otherwise, the signature is valid.

We stress that bytestring `BP` used in calculating *e* shall always be the *compressed* encoding of the public key, which is not necessarily the same as the encoding taken from stack (which could have been uncompressed).

## Message `m` calculation

In all cases, `m` is 32 bytes long.

For OP_CHECKSIG/VERIFY, `m` is obtained according to the [sighash digest algorithm](replay-protected-sighash.md#digest-algorithm) as informed by the `hashtype` byte, and involves hashing **twice** with SHA256.

For OP_CHECKDATASIG/VERIFY, `m` is obtained by popping `msg` from stack and hashing it **once** with SHA256.

This maintains the same relative hash-count semantics as with [the ECDSA versions of OP_CHECKSIG and OP_CHECKDATASIG](op_checkdatasig.md). Although there is an additional SHA256 in step 6 above, it can be considered as being internal to the Schnorr algorithm and it is shared by both opcodes.

## OP_CHECKMULTISIG/VERIFY

Due to complex conflicts with batch verification (see rationale below), OP_CHECKMULTISIG and OP_CHECKMULTISIGVERIFY are not permitted to accept Schnorr signatures for the time being.

After activation, signatures of the same length as Schnorr (=65 bytes: signature plus hashtype byte) will be disallowed and cause script failure, regardless of the signature contents.

* OP_CHECKDATASIG before upgrade: 64 byte signature is treated as ECDSA.
* OP_CHECKDATASIG after upgrade: 64 byte signature is treated as *Schnorr*.
* OP_CHECKSIG before upgrade: 65 byte signature is treated as ECDSA.
* OP_CHECKSIG after upgrade: 65 byte signature is treated as *Schnorr*.
* OP_CHECKMULTISIG before upgrade: 65 byte signature is treated as ECDSA.
* OP_CHECKMULTISIG after upgrade: 65 byte signature *causes script failure*.

Signatures shorter or longer than this exact number will continue to be treated as before. Note that it is very unlikely for a wallet to produce a 65 byte ECDSA signature (see later section "Lack of flag byte...").

# Recommended practices for secure signature generation

Signature generation is not part of the consensus change, however we would like to provide some security guidelines for wallet developers when they opt to implement Schnorr signing.

In brief, creation of a signature starts with the generation of a unique, unpredictable, secret nonce *k* value (0 < *k* < *n*). This produces *R* = *k*'*G* where *k*' = ±*k*, the sign chosen so that the Y coordinate of *R* has Jacobi symbol 1. Its X coordinate, *r*, is now known and in turn *e* is calculable as above. The signature is completed by calculating *s* = *k*' + *ex* mod *n* where *x* is the private key (i.e., *P* = *xG*).

As in ECDSA, there are security concerns arising in nonce generation. Improper nonce generation can in many cases lead to compromise of the private key *x*. A fully random *k* is secure, but unfortunately in many cases a cryptographically secure random number generator (CSRNG) is not available or not fully trusted/auditable.

A deterministic *k* (pseudorandomly derived from *x* and `m`) may be generated using an algorithm like [RFC6979](https://tools.ietf.org/html/rfc6979)(*modified*) or the algorithm suggested in Pieter Wuille's specification. However:

* Signers MUST NOT use straight RFC6979, since this is already used in many wallets doing ECDSA.
  * Suppose the same unsigned transaction were accidentally passed to both ECDSA and Schnorr wallets holding same key, which in turn were to generate the same RFC6979 *k*. This would be obvious (same *r* values) and in turn allow recovery of the private key from the distinct Schnorr *s* and ECDSA *s*' values: *x* = (±*ss*'-*z*)/(*r*±*s*'*e*) mod *n*.
  * We suggest using the RFC6979 sec 3.6 'additional data' mechanism, by appending the 16-byte ASCII string "Schnorr+SHA256␣␣" (here ␣ represents 0x20 -- ASCII space). The popular library libsecp256k1 supports passing a parameter `algo16` to `nonce_function_rfc6979` for this purpose.
* When making aggregate signatures, in contrast, implementations MUST NOT naively use deterministic *k* generation approaches, as this creates a vulnerability to nonce-reuse attacks from signing counterparties (see [MuSig paper section 3.2](https://eprint.iacr.org/2018/068)).

Hardware wallets SHOULD use deterministic nonce due to the lack of CSRNG and also for auditability reasons (to prove that kleptographic key leakage firmware is not installed). Software implementations are also recommended to use deterministic nonces even when CSRNG are available, as deterministic nonces can be unit tested.

# Rationale and commentary on design decisions

## Schnorr variant

Using the secp256k1 curve means that bitcoin's ECDSA keypairs (P,x) can be re-used as Schnorr keypairs. This has advantages in reducing the codebase, but also allows the opcode overloading approach described above.

This Schnorr variant has two advantages inherited from the EdDSA Schnorr algorithms:

* (R,s) signatures allow batch verification.
* Pubkey prefixing (in the hash) stops some related-key attacks. This is particularly relevant in situations when additively-derived keys (like in unhardened BIP32) are used in combination with OP_CHECKDATASIG (or with a possible future SIGHASH_NOINPUT).

The mechanism of Y coordinate stripping and Jacobi symbol symmetry breaking originates from Pieter Wuille and Greg Maxwell:

* It is important for batch verification that each *r* quickly maps to the intended *R*. It turns out that a natural choice presents itself during 'decompression' of X coordinate *r*: the default decompressed Y coordinate, *y* = (*r*<sup>3</sup> + 7)<sup>(*p*+1)/4</sup> mod *p* appears, which is a quadratic residue and has Jacobi symbol 1. (The alternative Y coordinate, -*y*, is always a quadratic nonresidue and has Jacobi symbol -1.)
* During single signature verification, Jacobian coordinates are typically used for curve operations. In this case it is easier to calculate the Jacobi symbol of the Y coordinate of *R*', than to perform an affine conversion to get its parity or sign.
* As a result this ends up slightly *more* efficient, both in bit size and CPU time, than if the parity or sign of Y were retained in the signature.

## Overloading of opcodes

We have chosen to *overload* the OP_CHECKSIG opcode since this means that a "Schnorr P2PKH address" looks just like a regular P2PKH address.

If we used a new opcode, this would also would prevent the advantages of keypair reuse, described below:

## Re-use of keypair encodings

An alternative overloading approach might have been to allocate a different public key prefix byte (0x0a, 0x0b) for Schnorr public keys, that distinguishes them from ECDSA public keys (prefixes 2,3,4,6,7). This would at least allow Schnorr addresses to appear like normal P2PKH addresses.

The advantage of re-using the same encoding (and potentially same keypairs) is that it makes Schnorr signatures into a 'drop-in-place' alternative to ECDSA:

* Existing wallet software can trivially switch to Schnorr signatures at their leisure, without even requiring users to generate new wallets.
* Does not create more confusion with restoration of wallet seeds / derivation paths ("was it an ECDSA or Schnorr wallet?").
* No new "Schnorr WIF private key" version is required.
* No new xpub / xprv versions are required.
* Protocols like BIP47 payment codes and stealth addresses continue to work unchanged.
* No security-weakening interactions exist between the ECDSA and Schnorr schemes, so key-reuse is not a concern.
* It may be possible eventually to remove ECDSA support (and thereby allow fully batched verification), without blocking any old coins.

There is a theoretical disadvantage in re-using keypairs. In the case of a severe break in the ECDSA or Schnorr algorithm, all addresses may be vulnerable whether intended solely for Schnorr or ECDSA --- "the security of signing becomes as weak as the weakest algorithm".<sup>[ref](https://lists.bitcoinunlimited.info/pipermail/bch-dev/2018-December/000002.html)</sup>

For privacy reasons, it may be beneficial for wallet developers to coordinate a 'Schnorr activation day' where all wallets simultaneously switch to produce Schnorr signatures by default.

## Non-inclusion of OP_CHECKMULTISIG

The design of OP_CHECKMULTISIG is strange, in that it requires checking a given signature against possibly multiple public keys in order to find a possible match. This approach unfortunately conflicts with batch verification where it is necessary to know ahead of time, which signature is supposed to match with which public key.

Going forward we would like to permanently support OP_CHECKMULTISIG, including Schnorr signature support but in a modified form that is compatible with batch verification. There are simple ways to do this, however the options are still being weighed and there is insufficient time to bring the new approach to fruition in time for the May 2019 upgrade.

In this upgrade we have chosen to take a 'wait and see' approach, by simply forbidding Schnorr signatures (and Schnorr-size signatures) in OP_CHECKMULTISIG for the time being. Schnorr multisignatures will still be possible through aggregation, but they are not a complete drop-in replacement for OP_CHECKMULTISIG.

## Lack of flag byte -- ECDSA / Schnorr ambiguity

In a previous version of this proposal, a flag byte (distinct from ECDSA's 0x30) was prepended for Schnorr signatures. There are some slight disadvantages in not using such a distinguishing byte:

* After the upgrade, if a user generates a 65-byte ECDSA signature (64-byte in CHECKDATASIG), then this will be interpreted as a Schnorr signature and thus unexpectedly render the transaction invalid.
* A flag byte could be useful if yet another signature protocol were to be added, to help distinguish a third type of signature.

However, these considerations were deemed to be of low significance:

* The probability of a user accidentally generating such a signature is 2<sup>-49</sup>, or 1 in a quadrillion (10<sup>15</sup>). It is thus unlikely that such an accident will occur to *any* user. Even if it happens, that individual can easily move on with a new signature.
* A flag byte distinction would only be relevant if a new protocol were to also use the secp256k1 curve. The next signature algorithm added to bitcoin will undoubtedly be something of a higher security level, in which case the *public key* would be distinguished, not the signature.
* Omitting the flag byte does save 1 byte per signature. This can be compared to the overall per-input byte size of P2PKH spending, which is currently ~147.5 for ECDSA signatures, and will be 141 bytes for Schnorr signatures as specified here.

Without a flag byte, however, implementors must take additional care in how signature byte blobs are treated. In particular, a malicious actor creating a short valid 64/65-byte ECDSA signature before the upgrade must not cause the creation of a cache entry wherein the same signature data would be incorrectly remembered as valid Schnorr signature, after the upgrade.

## Miscellaneous

* Applications that copy OP_CHECKSIG signatures into OP_CHECKDATASIG (such as zero-conf forfeits and self-inspecting transactions/covenants) will be unaffected as the semantics are identical, in terms of hash byte placement and number of hashes involved.
* As with ECDSA, the flexibility in nonce *k* means that Schnorr signatures are not *unique* signatures and are a source of first-party malleability. Curiously, however, aggregate signatures cannot be "second-party" malleated; producing a distinct signature requires the entire signing process to be restarted, with the involvement of all parties.

# Implementation / unit tests

The Bitcoin ABC implementation involved a number of Diffs: https://reviews.bitcoinabc.org/T527

Pieter Wuille's specification comes with a handy set of test vectors for checking cryptographic corner cases: https://github.com/sipa/bips/blob/bip-schnorr/bip-schnorr/test-vectors.csv

# Acknowledgements

Thanks to Amaury Séchet, Shammah Chancellor, Antony Zegers, Tomas van der Wansem, Greg Maxwell for helpful discussions.
