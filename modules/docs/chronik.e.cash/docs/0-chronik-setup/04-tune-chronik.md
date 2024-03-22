---
sidebar_position: 4
---

# Tune Chronik

You can tune Chronik to speed up indexing by changing the following parameters.

:::warning
This is advanced usage and it is recommended to leave these values at their default.
Changing them may slow down indexing if used incorrectly.
:::

## TxNumCache

When looking up the tx nums of spent txs, we utilize a TxNumCache to speed up indexing. By default, it requires 40MB of memory, but you may increase the numbers in the hopes of speeding up indexing if you have memory to spare.

-   `-chroniktxnumcachebuckets`: Increases the number of buckets used in the TxNumCache. Caution against setting this too high, it may slow down indexing because Chronik scans them linearly. Defaults to 10.
-   `-chroniktxnumcachebucketsize`: Increases the number of txs in a bucket in the TxNumCache. Defaults to 100000.
