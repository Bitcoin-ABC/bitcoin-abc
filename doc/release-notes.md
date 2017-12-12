Bitcoin ABC version 0.19.10 is now available from:

  <https://download.bitcoinabc.org/0.19.10/>

This release includes the following features and fixes:
  - Add a `spentby` field to the following RPCs: `getrawmempool`,
  `getmempooldescendents`, `getmempoolsancestors`, `getmempoolentry`.
  - Default to use CashAddr in most places in the GUI even when `usecashaddr=0` is specified.


Renamed script for creating JSON-RPC credentials
-----------------------------
The `share/rpcuser/rpcuser.py` script was renamed to `share/rpcauth/rpcauth.py`.
This script can be used to create `rpcauth` credentials for a JSON-RPC user.

Python Support
--------------

Support for Python 2 has been discontinued for all test files and tools.
