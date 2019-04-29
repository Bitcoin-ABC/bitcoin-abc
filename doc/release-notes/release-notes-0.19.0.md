Bitcoin ABC version 0.19.0 is now available from:

  <https://download.bitcoinabc.org/0.19.0/>

This release includes the following features and fixes:
 - Support for May 2019 upgrade features, as detailed at https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/2019-05-15-upgrade.md
    - Schnorr signatures in OP_CHECK(DATA)SIG(VERIFY): https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/2019-05-15-schnorr.md
    - Segwit P2SH recovery: https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/2019-05-15-segwit-recovery.md
 - Bump automatic replay protection to November 2019 upgrade
 - Fix bitcoin-qt crash on start for users who had previously selected minimum absolute fee.
 - Fix a regression in `getrawtransaction` output where `confirmations`, `time`, and `blocktime` were not present.
 - Fixed incorrect naming for the bitcoin-qt.desktop icon for Debian/Ubuntu distributions.
