# Bitcoin ABC 0.23.0 Release Notes

Bitcoin ABC version 0.23.0 is now available from:

  <https://download.bitcoinabc.org/0.23.0/>

This release includes the following features and fixes:
 - A `download` permission has been extracted from the `noban` permission. For
   compatibility, `noban` implies the `download` permission, but this may change
   in future releases. Refer to the help of the affected settings `-whitebind`
   and `-whitelist` for more details.
