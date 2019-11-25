Bitcoin ABC version 0.20.8 is now available from:

  <https://download.bitcoinabc.org/0.20.8/>

This release includes the following features and fixes:
 - When running bitcoind without `-daemon`, logging to stdout is now the 
   default behavior. Setting `-printtoconsole=1` no longer implicitly disables
   logging to debug.log. Instead, logging to file can be explicitly disabled by
   setting `-debuglogfile=0`.
