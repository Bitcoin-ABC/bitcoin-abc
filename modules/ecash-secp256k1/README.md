<div align="center">
  <h1>Rust Secp256k1</h1>
</div>

`ecash-secp256k1` is a wrapper around [libsecp256k1](https://github.com/bitcoin-abc/secp256k1), a C
library implementing various cryptographic functions using the [SECG](https://www.secg.org/) curve
[secp256k1](https://en.bitcoin.it/wiki/Secp256k1).

It's a fork of the [rust-secp256k1](https://github.com/rust-bitcoin/rust-secp256k1) library, with some minor eCash related modifications.

This library:

-   exposes type-safe Rust bindings for all `libsecp256k1` functions
-   implements key generation
-   implements deterministic nonce generation via RFC6979
-   implements many unit tests, adding to those already present in `libsecp256k1`
-   makes no allocations (except in unit tests) for efficiency and use in freestanding implementations
