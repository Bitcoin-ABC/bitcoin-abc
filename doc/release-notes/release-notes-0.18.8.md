Bitcoin ABC version 0.18.8 is now available from:

  <https://download.bitcoinabc.org/0.18.8/>

This release includes the following features and fixes:
 - `dumpwallet` now includes hex-encoded scripts from the wallet in the dumpfile
 - `importwallet` now imports these scripts, but corresponding addresses may not
   be added correctly or a manual rescan may be required to find relevant 
   transactions
 - `getblock <hash> 2` (verbosity = 2) now returns `hex` values in transaction JSON blobs
 - Remove miner policy estimator in favor of minimum fees, also remove `fee_estimates.dat`.
   Old copies will be left in place.
 - The log timestamp format is now ISO 8601 (e.g. "2019-01-28T15:41:17Z")
 - Behavior change: in case of multiple values for an argument, the following rules apply:
   - From the command line, the *last* value takes precedence
   - From the config file, the *first* value takes precedence
   - From the config file, if an argument is negated it takes precedent over all the
     previous occurences of this argument (e.g. "foo=2 \n nofoo=1" will set foo=0)
 - The configuration files now support assigning options to a specific network.
   To do so, sections or prefix can be used:
     main.uacomment=bch-mainnet
     test.uacomment=bch-testnet
     regtest.uacomment=bch-regtest
     [main]
     mempoolsize=300
     [test]
     mempoolsize=200
     [regtest]
     mempoolsize=50
   The `addnode=`, `connect=`, `port=`, `bind=`, `rpcport=`, `rpcbind=`
   and `wallet=` options will only apply to mainnet when specified in the
   configuration file, unless a network is specified.
