Bitcoin ABC version 0.18.8 is now available from:

  <https://download.bitcoinabc.org/0.18.8/>

This release includes the following features and fixes:
 - `dumpwallet` now includes hex-encoded scripts from the wallet in the dumpfile
 - `importwallet` now imports these scripts, but corresponding addresses may not
   be added correctly or a manual rescan may be required to find relevant 
   transactions
 - Remove miner policy estimator in favor of minimum fees, also remove `fee_estimates.dat`.
   Old copies will be left in place.
 - The log timestamp format is now ISO 8601 (e.g. "2019-01-28T15:41:17Z")
 - Behavior change: in case of multiple values for an argument, the following rules apply:
   - From the command line, the *last* value takes precedence
   - From the config file, the *first* value takes precedence