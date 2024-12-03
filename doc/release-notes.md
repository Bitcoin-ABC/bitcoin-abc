# Bitcoin ABC 0.30.6 Release Notes

Bitcoin ABC version 0.30.6 is now available from:

  <https://download.bitcoinabc.org/0.30.6/>

This release includes the following features and fixes:
 - A new `getinfo` RPC has been added to retrieve basic information about the
   node.
 - A bug only affecting nodes with avalanche disabled has been fixed. This bug
   could cause the node to crash under certain circumstances. Avalanche is
   enabled by default and disabling the feature is highly discouraged.
 - The MacOS release is now built with Chronik support, which can be enabled
   with the `-chronik` option just like the other platforms.
 - Starting with this version, support for MacOS 10.15 Catalina has been
   removed. The release build requires MacOS 11.0 (Big Sur) or above.
 - The MacOS .dmg file will no longer be distributed and is replaced by a .zip
   archive. To install, just drag the application into the Applications folder.
