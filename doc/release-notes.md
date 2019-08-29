Bitcoin ABC version 0.20.1 is now available from:

  <https://download.bitcoinabc.org/0.20.1/>

This release includes the following features and fixes:
 - From 0.20.1 onwards macOS <10.10 is no longer supported.
   0.20.1 is built using Qt 5.9.6, which doesn't support
   versions of macOS older than 10.10.
 - `sendmany` now shuffles outputs to improve privacy, so any previously expected behavior with regards to output ordering can no longer be relied upon.
 - It is no longer possible to create a new receiving address from the address
   book in `bitcoin-qt`; the `Receive` tab should be used instead.
 - Documentation improvements.
 - Minor bug fixes.
