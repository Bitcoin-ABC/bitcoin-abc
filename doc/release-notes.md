# Bitcoin ABC 0.32.2 Release Notes

Bitcoin ABC version 0.32.2 is now available from:

  <https://download.bitcoinabc.org/0.32.2/>

This release includes the following features and fixes:
 - The "blk-bad-inputs (parallel script check failed)" error message in the debug log
   is replaced with a more descriptive "mandatory-script-verify-flag-failed" with
   an exact script error. Note that parallel validation is non-deterministic in what
   error it may encounter first if there are multiple issues.