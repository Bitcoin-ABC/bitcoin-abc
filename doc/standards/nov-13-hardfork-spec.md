---
layout: specification
title: November 13th Bitcoin Cash Hardfork Technical Details
category: spec
date: 2017-11-07
activation: 1510600000
version: 1.3
---

## Summary

When the median time past[1] of the most recent 11 blocks (MTP-11) is greater than or equal to UNIX timestamp 1510600000 Bitcoin Cash will execute a hardfork according to this specification. Starting from the next block these three consensus rules changes will take effect:

* Enforcement of LOW_S signatures ([BIP 0146](https://github.com/bitcoin/bips/blob/master/bip-0146.mediawiki#low_s))
* Enforcement of NULLFAIL ([BIP 0146](https://github.com/bitcoin/bips/blob/master/bip-0146.mediawiki#nullfail))
* A replacement for the emergency difficulty adjustment. The algorithm for the new difficulty adjustment is described below

## Difficulty Adjustment Algorithm Description

To calculate the difficulty of a given block (B_n+1), with an MTP-11[1] greater than or equal to the unix timestamp 1510600000, perform the following steps:

* NOTE: Implementations must use integer arithmetic only

1. Let B_n be the Nth block in a Bitcoin Cash Blockchain.
1. Let B_last be chosen[2] from [B_n-2, B_n-1, B_n].
1. Let B_first be chosen[2] from [B_n-146, B_n-145, B_n-144].
1. Let the Timespan (TS) be equal to the difference in UNIX timestamps (in seconds) between B_last and B_first within the range [72 * 600, 288 * 600].  Values outside should be treated as their respective limit
1. Let the Work Performed (W) be equal to the difference in chainwork[3] between B_last  and B_first.
1. Let the Projected Work (PW) be equal to (W * 600) / TS.
1. Let Target (T) be equal to the (2^256 - PW) / PW.  This is calculated by taking the two’s complement of PW (-PW) and dividing it by PW (-PW / PW).
1. The target difficulty for block B_n+1 is then equal to the lesser of T and 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF

## Test Case

1. Create a genesis block with the following data:

```
    nHeight = 0;
    nTime = 1269211443;
    nBits = 0x1c0fffff;
```

1. Add 2049 blocks at 600 second intervals with the same nBits.
1. Add another 10 blocks at 600 second intervals.  nBits should remain constant.
1. Add a block 6000 seconds in the future with nBits remaining the same.
1. Add a block -4800 seconds from the previous block.  nBits should remain the constant.
1. Add 20 blocks at 600 second intervals.  nBits should remain constant.
1. Add a block at a 550 second interval. nBits should remain constant.
1. Add 10 blocks at 550 second intervals. The target difficulty should slowly decrease.
1. nBits should be 0x1c0fe7b1.
1. Add 20 more blocks at 10 second intervals.  The target difficulty decrease quickly.
1. nBits should be 0x1c0db19f.
1. Add 1 block at an interval of 6000 seconds.
1. nBits should be 0x1c0d9222.
1. Produce 93 blocks at 6000 second intervals. The target difficulty should increase.
1. nBits should be 0x1c2f13b9.
1. Add one block at 6000 seconds.
1. nBits should be 0x1c2ee9bf.
1. Add 192 blocks at 6000 second intervals.  The target difficulty should increase.
1. nBits should be 0x1d00ffff.
1. Add 5 blocks at 6000 second intervals.  Target should stay constant at the maximum value.

## References

 - [Algorithm](https://github.com/Bitcoin-ABC/bitcoin-abc/commit/be51cf295c239ff6395a0aa67a3e13906aca9cb2)
 - [Activation](https://github.com/Bitcoin-ABC/bitcoin-abc/commit/18dc8bb907091d69f4887560ab2e4cfbc19bae77)
 - [Activation Time](https://github.com/Bitcoin-ABC/bitcoin-abc/commit/8eed7939c72781a812fdf3fb8c36d4e3a428d268)
 - [Test Case](https://github.com/Bitcoin-ABC/bitcoin-abc/blob/d8eac91f8d16716eed0ad11ccac420122280bb13/src/test/pow_tests.cpp#L193)

FAQ
---
Q: Does this imply that if the blocks are timestamped sequentially, the last block has no effect since it will look at the block before that one?

A: Yes

Footnotes
---------
1. The MTP-11 of a block is defined as the median timestamp of the last 11 blocks prior to, and including, a specific block
2. A block is chosen via the following mechanism:
   Given a list: S = [B_n-2, B_n-1, B_n]
   a. If timestamp(S[0]) greater than timestamp(S[2]) then swap S[0] and S[2].
   b. If timestamp(S[0]) greater than timestamp(S[1]) then swap S[0] and S[1].
   c. If timestamp(S[1]) greater than timestamp(S[2]) then swap S[1] and S[2].
   d. Return S[1].
   See [GetSuitableBlock](https://github.com/Bitcoin-ABC/bitcoin-abc/commit/be51cf295c239ff6395a0aa67a3e13906aca9cb2#diff-ba91592f703a9d0badf94e67144bc0aaR208)
3. Chainwork for a Block (B) is the sum of block proofs from the genesis block up to and including block `B`.  `Block proof` is defined in [chain.cpp](https://github.com/Bitcoin-ABC/bitcoin-abc/blob/d8eac91f8d16716eed0ad11ccac420122280bb13/src/chain.cpp#L132)
