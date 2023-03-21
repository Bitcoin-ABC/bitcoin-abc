# Bitcoin ABC 0.31.6 Release Notes

Bitcoin ABC version 0.31.6 is now available from:

  <https://download.bitcoinabc.org/0.31.6/>

Configuration:
--------------

- `bitcoind` and `bitcoin-qt` will now raise an error on startup if a datadir that
  is being used contains a bitcoin.conf file that will be ignored, which can happen
  when a datadir= line is used in a bitcoin.conf file. The error message is just a
  diagnostic intended to prevent accidental misconfiguration, and it can be disabled
  with `-allowignoredconf` to restore the previous behavior of using the datadir
  while ignoring the bitcoin.conf contained in it.
