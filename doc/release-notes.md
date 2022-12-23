# Bitcoin ABC 0.29.8 Release Notes

Bitcoin ABC version 0.29.8 is now available from:

  <https://download.bitcoinabc.org/0.29.8/>

This release includes the following features and fixes:
 - The `testmempoolaccept` RPC now returns 2 additional results within the
   `fees` result: `effective-feerate` is the feerate including fees and sizes of
   transactions validated together if package validation was used, and also
   includes any modified fees from prioritisetransaction. The
   `effective-includes` result lists the txids of transactions whose modified
   fees and sizes were used in the effective-feerate.
