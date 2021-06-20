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
|               ns/op |                op/s |    err% |     total | benchmark
|--------------------:|--------------------:|--------:|----------:|:----------
|       57,927,463.00 |               17.26 |    3.6% |      0.66 | `AddrManAdd`
|          677,816.00 |            1,475.33 |    4.9% |      0.01 | `AddrManGetAddr`

...

|             ns/byte |              byte/s |    err% |     total | benchmark
|--------------------:|--------------------:|--------:|----------:|:----------
|              127.32 |        7,854,302.69 |    0.3% |      0.00 | `Base58CheckEncode`
|               31.95 |       31,303,226.99 |    0.2% |      0.00 | `Base58Decode`

...
```

Help
---------------------
`-?` will print a list of options and exit:

    src/bench/bitcoin-bench -?

To print the various options, like listing the benchmarks without running them
or using a regex filter to only run certain benchmarks.

Notes
---------------------
More benchmarks are needed for, in no particular order:
- Script Validation
- Coins database
- Memory pool

