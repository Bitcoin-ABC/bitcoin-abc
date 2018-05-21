Bitcoin ABC version 0.20.6 is now available from:

  <https://download.bitcoinabc.org/0.20.6/>

This release includes the following features and fixes:
 - `hdmasterkeyid` in `getwalletinfo` has been deprecated in favor of
   `hdseedid`.  `hdmasterkeyid` will be removed in V0.21.
 - `hdmasterkeyid` in `getaddressinfo` has been deprecated in favor of
   `hdseedid`.  `hdmasterkeyid` will be removed in V0.21.
 - The `inactivehdmaster` property in the `dumpwallet` output has been
   deprecated in favor of `inactivehdseed`. `inactivehdmaster` will be removed
   in V0.21.
