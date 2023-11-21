# Bitcoin ABC 0.28.4 Release Notes

Bitcoin ABC version 0.28.4 is now available from:

  <https://download.bitcoinabc.org/0.28.4/>

This release includes the following features and fixes:
 - The avalanche peers are now dumped to a file upon node shutdown and reloaded
   upon startup to allow for faster avalanche bootstraping. This feature can be
   disabled by using the `-persistavapeers=0` option.
