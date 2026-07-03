# Bitcoin ABC 0.33.8 Release Notes

Bitcoin ABC version 0.33.8 is now available from:

  <https://download.bitcoinabc.org/0.33.8/>

This release includes the following features and fixes:
- The implementation of the point multiplication algorithm used for signing and public key
  generation in libsepc256k1 was changed, resulting in improved performance for those operations.
  The related cmake option `SECP256K1_ECMULT_GEN_PRECISION` was replaced with
  `SECP256K1_ECMULT_GEN_KB`.  This changes the supported precomputed table sizes for these
  operations. The new supported sizes are 2 KiB, 22 KiB, or 86 KiB (while the old supported
  sizes were 32 KiB, 64 KiB, or 512 KiB).
