Bitcoin ABC version 0.21.5 is now available from:

  <https://download.bitcoinabc.org/0.21.5/>

This release includes the following features and fixes:
 - Removed deprecated `getinfo` RPC.
 - Update univalue to 1.0.5

Configuration
------------

* An error is issued where previously a warning was issued when a setting in
  the config file was specified in the default section, but not overridden for
  the selected network. This change takes only effect if the selected network
  is not mainnet.

