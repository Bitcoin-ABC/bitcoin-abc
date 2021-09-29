Benchmarking
============

Bitcoin ABC has an internal benchmarking framework, with benchmarks
for cryptographic algorithms (e.g. SHA1, SHA256, SHA512, RIPEMD160),
as well as the rolling bloom filter, address encoding and decoding,
CCoinsCaching, memory pool eviction, and wallet coin selection.

Running
---------------------
The benchmarks can be run with:

    ninja bench-bitcoin

The output will look similar to:
```
|             ns/byte |              byte/s | error % | benchmark
|--------------------:|--------------------:|--------:|:----------------------------------------------
|               64.13 |       15,592,356.01 |    0.1% | `Base58CheckEncode`
|               24.56 |       40,722,672.68 |    0.2% | `Base58Decode`

```

Help
---------------------
`-?` will print a list of options and exit:

    src/bench/bitcoin-bench -?

Notes
---------------------
More benchmarks are needed for, in no particular order:
- Script Validation
- Coins database
- Memory pool

