Bitcoin ABC version 0.16.3 is now available from:

  <https://download.bitcoinabc.org/0.16.3/>

This release includes the following features and fixes:
 - Add monolithactivationtime configuration in order to chose when the May, 15 hard fork activates. This value should not be changed in production, but it allows user to test the fork activation ahead of time.
 - `dumpwallet` no longer allows overwriting files. This is a security measure
   as well as prevents dangerous user mistakes.
