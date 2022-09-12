# Bitcoin ABC 0.26.0 Release Notes

Bitcoin ABC version 0.26.0 is now available from:

  <https://download.bitcoinabc.org/0.26.0/>

This release includes the following features and fixes:
- In previous releases, the meaning of the command line option
  `-persistmempool` (without a value provided) incorrectly disabled mempool
  persistence.  `-persistmempool` is now treated like other boolean options to
  mean `-persistmempool=1`. Passing `-persistmempool=0`, `-persistmempool=1`
  and `-nopersistmempool` is unaffected.
- This release supports Avalanche Post-consensus. See `bitcoind -help` for the
  related options.
