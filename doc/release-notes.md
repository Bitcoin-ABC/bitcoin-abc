Bitcoin ABC version 0.20.8 is now available from:

  <https://download.bitcoinabc.org/0.20.8/>

This release includes the following features and fixes:
 - When running bitcoind without `-daemon`, logging to stdout is now the 
   default behavior. Setting `-printtoconsole=1` no longer implicitly disables
   logging to debug.log. Instead, logging to file can be explicitly disabled by
   setting `-debuglogfile=0`.
 - `getlabeladdress` has been removed and replaced with `getaccountaddress`
   until v0.21 at which time `getaccountaddress` will also be removed.  To
   use `getaccountaddress` start `bitcoind` with the `-deprecatedrpc=accounts`
   option.  See the v0.20.6 release notes for more details.
