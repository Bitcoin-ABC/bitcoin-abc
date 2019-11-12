# Bitcoin ABC 0.22.4 Release Notes

Bitcoin ABC version 0.22.4 is now available from:

  <https://download.bitcoinabc.org/0.22.4/>

This release includes the following features and fixes:

Command-line options
--------------------

-  The `-debug=db` logging category has been renamed to `-debug=walletdb`, to distinguish it from `coindb`.
   `-debug=db` has been deprecated and will be removed in a next release.


Low-level RPC Changes
---------------------

- The RPC gettransaction, listtransactions and listsinceblock responses now also
includes the height of the block that contains the wallet transaction, if any.
