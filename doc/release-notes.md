# Bitcoin ABC 0.29.10 Release Notes

Bitcoin ABC version 0.29.10 is now available from:

  <https://download.bitcoinabc.org/0.29.10/>

This release includes the following fixes:
 - Fix a potential inifinite loop bug, which can be exploited by a local network
   device when the node is running with UPnP enabled. This feature is disabled
   by default and only the node operators who added the configuration option
   `-upnp=1` are affected. These operators are encouraged to update.
 - Fix a couple Chronik bugs that could corrupt the database under special
   circumstances. Chronik operators are encouraged to update.
