Benchmarking
============

Bitcoin ABC has an internal benchmarking framework, with benchmarks
for cryptographic algorithms such as SHA1, SHA256, SHA512, RIPEMD160,
the rolling bloom filter, address encoding and decoding, CCoinsCaching,
memory pool eviction, and wallet coin selection.

After compiling bitcoin-abc, the benchmarks can be run with:
`src/bench/bench_bitcoin`

The output will look similar to:
```
# Benchmark, evals, iterations, total, min, max, median
Base58CheckEncode, 5, 320000, 5.28577, 3.27814e-06, 3.36971e-06, 3.29183e-06
Base58Decode, 5, 800000, 4.71472, 1.16438e-06, 1.20043e-06, 1.17352e-06
Base58Encode, 5, 470000, 4.80062, 2.03992e-06, 2.04861e-06, 2.04084e-06
BenchLockedPool, 5, 530, 5.08076, 0.00189861, 0.00193961, 0.00191404
CCheckQueueSpeedPrevectorJob, 5, 1400, 3.45167, 0.000482017, 0.000502189, 0.000494358
CCoinsCaching, 5, 170000, 3.17266, 3.66883e-06, 3.85988e-06, 3.68462e-06
CashAddrDecode, 5, 800000, 3.40281, 8.47462e-07, 8.56334e-07, 8.49539e-07
CashAddrEncode, 5, 800000, 2.14463, 5.19902e-07, 5.44274e-07, 5.43256e-07
CoinSelection, 5, 650, 4.91077, 0.00149673, 0.00152377, 0.00151478
DeserializeAndCheckBlockTest, 5, 160, 7.95019, 0.00983543, 0.010025, 0.00995759
DeserializeBlockTest, 5, 130, 3.97769, 0.00608507, 0.00617347, 0.00611737
FastRandom_1bit, 5, 440000000, 3.52478, 1.59844e-09, 1.60445e-09, 1.60243e-09
FastRandom_32bit, 5, 110000000, 4.75589, 8.55725e-09, 8.81171e-09, 8.5712e-09
MempoolEviction, 5, 41000, 3.13696, 1.5251e-05, 1.53693e-05, 1.53068e-05
MerkleRoot, 5, 800, 25.2939, 0.00622814, 0.0064672, 0.0062586
PrevectorClearNontrivial, 5, 28300, 10.8137, 7.60788e-05, 7.73677e-05, 7.62496e-05
PrevectorClearTrivial, 5, 88600, 20.1727, 4.52744e-05, 4.57312e-05, 4.54863e-05
PrevectorDestructorNontrivial, 5, 28800, 9.38879, 6.48316e-05, 6.54969e-05, 6.52511e-05
PrevectorDestructorTrivial, 5, 88900, 20.7015, 4.63369e-05, 4.67035e-05, 4.66142e-05
PrevectorResizeNontrivial, 5, 28900, 2.86174, 1.97734e-05, 1.98625e-05, 1.9797e-05
PrevectorResizeTrivial, 5, 90300, 3.33574, 7.32896e-06, 7.46976e-06, 7.38089e-06
RIPEMD160, 5, 440, 5.02836, 0.00224976, 0.00229784, 0.00229684
RollingBloom, 5, 1500000, 4.86547, 6.35376e-07, 6.57399e-07, 6.50339e-07
SHA1, 5, 570, 4.69405, 0.00160936, 0.00171571, 0.00161574
SHA256, 5, 340, 7.18121, 0.00419859, 0.00425665, 0.00423095
SHA256D64_1024, 5, 7400, 26.1915, 0.000701612, 0.00071808, 0.000705198
SHA256_32b, 5, 4700000, 7.02517, 2.95913e-07, 3.03323e-07, 2.97997e-07
SHA512, 5, 330, 4.40307, 0.00265286, 0.00267815, 0.00267316
SipHash_32b, 5, 40000000, 5.03543, 2.48915e-08, 2.56569e-08, 2.49465e-08
Sleep100ms, 5, 10, 5.00483, 0.100091, 0.100108, 0.100095
Trig, 5, 12000000, 2.17942, 3.60625e-08, 3.64305e-08, 3.63656e-08

```

More benchmarks are needed for, in no particular order:
- Script Validation
- Coins database
- Memory pool

