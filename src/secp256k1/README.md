libsecp256k1
============

[![Build Status](https://travis-ci.org/bitcoin-abc/secp256k1.svg?branch=master)](https://travis-ci.org/bitcoin-abc/secp256k1)

Optimized C library for cryptographic operations on curve secp256k1.

This library is used for consensus critical cryptographic operations on the Bitcoin Cash network. It is maintained within the Bitcoin ABC repository, and is mirrored as a separate repository for ease of reuse in other Bitcoin Cash projects. Developers who want to contribute may do so at [reviews.bitcoinabc.org](https://reviews.bitcoinabc.org/). Use at your own risk.

Features:
* secp256k1 ECDSA signing/verification and key generation.
* secp256k1 Schnorr signing/verification ([Bitcoin Cash Schnorr variant](https://www.bitcoincash.org/spec/2019-05-15-schnorr.html)).
* Adding/multiplying private/public keys.
* Serialization/parsing of private keys, public keys, signatures.
* Constant time, constant memory access signing and pubkey generation.
* Derandomized DSA (via RFC6979 or with a caller provided function.)
* Very efficient implementation.

Implementation details
----------------------

* General
  * No runtime heap allocation.
  * Extensive testing infrastructure.
  * Structured to facilitate review and analysis.
  * Intended to be portable to any system with a C89 compiler and uint64_t support.
  * No use of floating types, except in benchmarks.
  * Expose only higher level interfaces to minimize the API surface and improve application security. ("Be difficult to use insecurely.")
* Field operations
  * Optimized implementation of arithmetic modulo the curve's field size (2^256 - 0x1000003D1).
    * Using 5 52-bit limbs (including hand-optimized assembly for x86_64, by Diederik Huys).
    * Using 10 26-bit limbs.
  * Field inverses and square roots using a sliding window over blocks of 1s (by Peter Dettman).
* Scalar operations
  * Optimized implementation without data-dependent branches of arithmetic modulo the curve's order.
    * Using 4 64-bit limbs (relying on __int128 support in the compiler).
    * Using 8 32-bit limbs.
* Group operations
  * Point addition formula specifically simplified for the curve equation (y^2 = x^3 + 7).
  * Use addition between points in Jacobian and affine coordinates where possible.
  * Use a unified addition/doubling formula where necessary to avoid data-dependent branches.
  * Point/x comparison without a field inversion by comparison in the Jacobian coordinate space.
* Point multiplication for verification (a*P + b*G).
  * Use wNAF notation for point multiplicands.
  * Use a much larger window for multiples of G, using precomputed multiples.
  * Use Shamir's trick to do the multiplication with the public key and the generator simultaneously.
  * Optionally (off by default) use secp256k1's efficiently-computable endomorphism to split the P multiplicand into 2 half-sized ones.
* Point multiplication for signing
  * Use a precomputed table of multiples of powers of 16 multiplied with the generator, so general multiplication becomes a series of additions.
  * Intended to be completely free of timing sidechannels for secret-key operations (on reasonable hardware/toolchains)
    * Access the table with branch-free conditional moves so memory access is uniform.
    * No data-dependent branches
  * Optional runtime blinding which attempts to frustrate differential power analysis.
  * The precomputed tables add and eventually subtract points for which no known scalar (private key) is known, preventing even an attacker with control over the private key used to control the data internally.

Build steps
-----------

libsecp256k1 can be built using autotools:

```bash
./autogen.sh
mkdir build
cd build
../configure
make
make check
sudo make install  # optional
```

Or using CMake:

```bash
mkdir build
cd build
cmake -GNinja ..
ninja
ninja check-secp256k1
sudo ninja install  # optional
```
