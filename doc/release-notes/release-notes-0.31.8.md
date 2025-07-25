# Bitcoin ABC 0.31.8 Release Notes

Bitcoin ABC version 0.31.8 is now available from:

  <https://download.bitcoinabc.org/0.31.8/>

Chronik Electrum interface
---------------------------

Chronik is now fully compatible with the ElectrumX protocol up to version 1.4.1 and the Electrum Cash protocol up to version 1.4.5 over TCP, TLS, WS and WSS.
Most changes from later Electrum Cash versions are also supported with the exception of the features that are not available to eCash.

For more information please refer to (the documentation)[/doc/chronik-electrum.md].

Known issues
------------

This release introduced a change that causes some of the Windows release artifacts to be non-deterministic.
This means that replicating the build will not give you bit-by-bit identical binaries.
This only affects the Windows binaries distributed in the ZIP archive files.
The Windows installer (EXE) and the other platforms are not affected.
