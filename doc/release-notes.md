# Bitcoin ABC 0.24.7 Release Notes

Bitcoin ABC version 0.24.7 is now available from:

  <https://download.bitcoinabc.org/0.24.7/>

This release includes the following features and fixes:

- The `sendrawtransaction` error code for exceeding `maxfeerate` has been changed from
  `-26` to `-25`. The error string has been changed from "absurdly-high-fee" to
  "Fee exceeds maximum configured by user (e.g. -maxtxfee, maxfeerate)." The
  `testmempoolaccept` RPC returns `max-fee-exceeded` rather than `absurdly-high-fee`
  as the `reject-reason`.
- To make wallet and rawtransaction RPCs more consistent, the error message for
  exceeding maximum feerate has been changed to "Fee exceeds maximum configured by user
  (e.g. -maxtxfee, maxfeerate)."
