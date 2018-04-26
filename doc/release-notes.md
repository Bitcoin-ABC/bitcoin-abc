Bitcoin ABC version 0.20.4 is now available from:

  <https://download.bitcoinabc.org/0.20.4/>

This release includes the following features and fixes:
 - Minor bug fixes and improvements.
 - New `fees` field introduced in `getrawmempool`, `getmempoolancestors`,
   `getmempooldescendants` and  `getmempoolentry` when verbosity is set to
   `true` with sub-fields `ancestor`, `base`, `modified` and `descendant`
   denominated in BCH. This new field deprecates previous fee fields, such a
   `fee`, `modifiedfee`, `ancestorfee` and `descendantfee`.
