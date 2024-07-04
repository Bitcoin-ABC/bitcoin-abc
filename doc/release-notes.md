# Bitcoin ABC 0.29.8 Release Notes

Bitcoin ABC version 0.29.8 is now available from:

  <https://download.bitcoinabc.org/0.29.8/>

This release includes the following features and fixes:
 - Fix a potential OOM crash of bitcoin-qt when opening a BIP72 URI pointing to
   a very large file. The node will stop downloading the payment request if it
   exceeds the max size of 50kB.
 - The `testmempoolaccept` RPC now returns 2 additional results within the
   `fees` result: `effective-feerate` is the feerate including fees and sizes of
   transactions validated together if package validation was used, and also
   includes any modified fees from prioritisetransaction. The
   `effective-includes` result lists the txids of transactions whose modified
   fees and sizes were used in the effective-feerate.
