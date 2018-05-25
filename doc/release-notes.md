Bitcoin ABC version 0.17.3 is now available from:

  <https://download.bitcoinabc.org/0.17.3/>

This release includes the following features and fixes:
 - Update fee calculation to add 179 effective bytes per transaction output in excess of inputs.
   Refund 179 bytes worth of minimum fee per input in excess of outputs to a minimum of
   10 + 34 * (number of utxos)
 - Default minimum relay fee dropped to 250 sat/kb from 1000sat/kb
