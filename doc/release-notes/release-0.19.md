Below is a list of previous bitcoin/bitcoin-abc release notes, from Bitcoin ABC 19.0

This release includes the following features and fixes:
 - Support for May 2019 upgrade features, as detailed at https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/2019-05-15-upgrade.md
    - Schnorr signatures in OP_CHECK(DATA)SIG(VERIFY): https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/2019-05-15-schnorr.md
    - Segwit P2SH recovery: https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/2019-05-15-segwit-recovery.md
 - Bump automatic replay protection to November 2019 upgrade
 - Fix bitcoin-qt crash on start for users who had previously selected minimum absolute fee.
 - Fix a regression in `getrawtransaction` output where `confirmations`, `time`, and `blocktime` were not present.
 - Fixed incorrect naming for the bitcoin-qt.desktop icon for Debian/Ubuntu distributions.

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
Bitcoin ABC version 0.18.7 is now available from:


This release includes the following features and fixes:
 - Add the `-walletdir` option to configure the directory in which the wallet
   files are stored. An absolute path should be used.
 - Add the `-debuglogfile` option to change the path of the debug log file.
 - Fix issue where bitcoin-qt fails to launch for Qt versions >=5.11
 - Minimum supported version of gcc bumped to 4.8.0
 - Several minor bug fixes
Bitcoin ABC version 0.18.6 is now available from:

This release includes the following features and fixes:
 - Add `getfinalizedblockhash` rpc to allow node operators to introspec
 the current finalized block.
 - Wallet `getnewaddress` and `addmultisigaddress` RPC `account` named
   parameters have been renamed to `label` with no change in behavior.
 - Wallet `getlabeladdress`, `getreceivedbylabel`, `listreceivedbylabel`, and
   `setlabel` RPCs have been added to replace `getaccountaddress`,
   `getreceivedbyaccount`, `listreceivedbyaccount`, and `setaccount` RPCs,
   which are now deprecated. There is no change in behavior between the
   new RPCs and deprecated RPCs.
 - Wallet `listreceivedbylabel`, `listreceivedbyaccount` and `listunspent` RPCs
   add `label` fields to returned JSON objects that previously only had
   `account` fields.
 - Add the `-finalizationdelay` to configure the minimum amount of time to wait
   between a block header reception and the block finalization. Unit is seconds,
   default is 7200 (2h).
Bitcoin ABC version 0.18.5 is now available from:

This release includes the following features and fixes:
 - Add the finalized block concept. Finalized blocks cannot be reorged, which protects the network against deep reorgs.
 - Add the `-maxreorgdepth` configuration to configure at what depth block are considered final. Default is 10. Use -1 to disable.
 - Introduce `finalizeblock` RPC to finalize a block at the will of the node operator.
 - Introduce a penalty to alternative chains based on the depth of the fork. This makes it harder for an attacker to do mid size reorg.
Bitcoin ABC version 0.18.4 is now available from:


This release includes the following features and fixes:
  - Fixes an issue with `getblocktemplate` returning fees and sigops in non-CTOR ordering after Nov 15th CTOR activation.
Bitcoin ABC version 0.18.3 is now available from:


This release includes the following features and fixes:
 - Remove support for Qt4
 - Upgrade reproducible build to use Qt 5.9.6
 - Improve SHA256 performance using SSE4.1, AVX2 and/or SHA if available.
 - Add a mode argument to the `getmemoryinfo` RPC call to query `malloc_info` from the system if available.
 - Updated univalue library to version 1.0.4
 - Disable safe mode by default
 - Added autocomplete to 'help' in RPC console
 - Deprecated estimatefee RPC command
 - Improved help message for backup wallet RPC
 - Various bug fixes that improve node stability and performance
 - Backport getblock RPC's new verbosity mode from bitcoin core for retrieving all transactions of a given block in full.
 - Added parkblock/unparkblock RPC commands and 'parked' state to getchaintips RPC
 - RPC `listreceivedbyaddress` now accepts an address filter
 - Backport combinerawtransaction RPC from bitcoin core to combine multiple partially signed transactions into one transaction.
Bitcoin ABC version 0.18.2 is now available from:

This release includes the following features and fixes:
 - Backport abortrescan RPC call from bitcoin core.
 - Backport fix to importmulti to return rescan errors.
 - Backport ability to abort wallet transaction rescans.
 - Backport adding listen address to incoming connections in getpeerinfo.
 - Backport rescanblockchain RPC call.
 - Various backports for bug fixes and performance improvements.
 - Increase INVENTORY_BROADCAST_MAX, allowing more transaction broadcasts via INV.

Bitcoin ABC version 0.18.1 is now available from:

This release includes the following features and fixes:
 - Fix a mining bug that affects block creation, impact after Nov upgrade.
 - Fix a bug that could result in dropping transactions from re-orgs,
   impact after Nov upgrade.
 - Reserve a range for multi byte opcodes in the script system.
 - Various test fixes, speedups, and refactors.

Bitcoin ABC version 0.18.0 is now available from:


This release includes the following features and fixes:
 - Remove the bip9params configuration.
 - Remove the bip9_softforks result from the getblockchaininfo RPC call.
 - Remove the rules, vbavailable and vbrequired result from the
   getblocktemplate RPC call.
 - Remove the rules argument from the getblocktemplate RPC call.
 - Log difference between block header time and received time when competing
   blocks are received for the same chain height.
 - Bump automatic replay protection to May 2019 upgrade.
 - Remove topological ordering constraint from blocks starting Nov, 15 2018.
 - Implement canonical transaction order, enforced Nov, 15 2018.
 - Add OP_CHECKDATASIG and OP_CHECKDATASIGVERIFY, activates Nov, 15 2018.
 - Enforce minimum transaction size of 100 bytes, starting Nov, 15 2018.
 - Enforce PUSH ONLY rule for scriptSig, starting Nov, 15 2018.
 - Enforce CLEANSTACK rule, starting Nov 15, 2018.

Bitcoin ABC version 0.17.2 is now available from:

This release includes the following features and fixes:
 - Remove deprecated `estimatepriority` RPC.
 - Remove deprecated `estimatesmartpriority` RPC.
 - Remove support for `-sendfreetransactions`.
 - Remove unstable `estimatesmartfee` RPC.
 - Update berkley DB to 5.3 minimum. Developers should update their build environment accordingly.
 - Remove `-incrementalrelayfee` option
Bitcoin ABC version 0.17.1 is now available from:

This release includes the following features and fixes:
 - Added CORS headers and pre-flight request support via RPC via required flag `-rpccorsdomain`.
 - Allow block candidates greater than 16MB to be submitted via RPC.
Bitcoin ABC version 0.17.0 is now available from:

This release includes the following features and fixes:
 - Add monolithactivationtime configuration in order to chose when the May, 15 hard fork activates. This value should not be changed in production, but it allows user to test the fork activation ahead of time.
 - `dumpwallet` no longer allows overwriting files. This is a security measure
   as well as prevents dangerous user mistakes.
 - Node using the wrong magic are now getting banned.
 - cmake builds are now possible for bitcoind and other utilities.
 - Correct `open source` to `open-source` in README.md (Props to John Carvalho)
 - Add SSE4 optimized SHA256 (Port from Bitcoin Core)
 - Multiwallet support (Port from Bitcoin Core)
 - Lots of improvements to the RPC test suite (Ports from Bitcoin Core)
 - Uptime rpc command (Port from Bitcoin Core)
 - At the MTP time of 1526400000 (Tue May 15 16:00:00 UTC, 2018) the following behaviors will change:
	 - Increase the default datacarriersize to 220 byte at the MTP time of 1526400000
	 - Increase the maximum blocksize to 32,000,000 bytes at the MTP time of 1526400000
	 - Re-activate the following opcodes: OP_CAT, OP_AND, OP_OR, OP_XOR, OP_DIV, OP_MOD
	 - Add the following new opcodes: OP_SPLIT to replace OP_SUBSTR, OP_NUM2BIN, OP_BIN2NUM
Bitcoin ABC version 0.16.2 is now available from:

This release includes the following features and fixes:

 - Remove the newdaaactivationtime configuration.
 - Do not use the NODE_BITCOIN_CASH service bit for preferencial peering anymore.
 - Only connect to node using the cash magic.
 - Remove indicator mentionning if a node uses the cash magic getpeerinfo RPC.
 - Add support for the new cashaddr format. The `-usecashaddr` flag can be used to select which format is used when presenting addresses to users. By default, Bitcoin ABC will keep using the old format until Jan, 14 and then switch to the new format. Both format are now accepted as input.
Bitcoin ABC version 0.16.1 is now available from:

This release includes the following features and fixes:

- Update seeds
Bitcoin ABC version 0.16.0 is now available from:


This release includes the following features and fixes:

- New difficulty adjustement algorithm due to activate on Nov, 13
- Start enforcing LOW_S and NULLFAIL after Nov, 13
Bitcoin ABC version 0.15.1 is now available from:

This release includes the following features and fixes:

- Cache script validation. Backport from Core 10192 (D527, D530, D531).
- Put back copyright notices inadvertently removed by Core (D538).
- Add Amount class for CENT and COIN (D529).
- Display if a node is using Cash magic in getpeerinfo (D546).
- Use Cash magic by default when establishing connections (D547).
- Add seeder to Bitcoin ABC repository. From Bitcoin Seeder by Pieter Wiulle.
  (D559, D560, D561, D562, D564, D565, D566, D568, D579, D585)
- Ensure backupwallet fails if target is the same as source (D550).
- Upgrade to LevelDB 1.20. Port of Core 10544 and 10958 (D580, D584).
- Various backports from Core.
- Various bug fixes.
- Various style fixes, code cleanups, and refactorings.
Bitcoin ABC version 0.15.0 is now available from:

This release includes the following features and fixes:

- Reserve block space for high priority transactions (D485)
- Use "bitcoincash:" URI (D466)
- Add and accept Bitcoin Cash networking magic (D400)
- Peer preferentially with NODE_CASH nodes (D457)
- Hardcoded seeds update (D403)
- Remove UAHF RPC calls, and some of the UAHF activation logic (D407, D417)
- Various test fixes and other cleanups now that UAHF activation is past
- Various changes now that we do replay protected txns only (D437, D440, D442, D444, D451, D455, D456)
- Make SCRIPT_VERIFY_STRICTENC a mandatory flag (D421)
- Fix RPC signrawtransaction silently accepting missing amount field (D449)
- Fix a some small memory leaks, and an overflow (D372, D452, D472)
- Added sanitizer support (D474, D481)
- Rename package to bitcoin-abc-* (D482, D489, D510, D513)
- Cryptographic randomness improvements (backport from Core PR9821 and PR9792) (D488, D490)
- Store the UTXO set on a per output basis rather than a per transaction basis (backport from Core)
- Various other backports and fixes from Core
- Various fixes and improvements to test suite
- Various code cleanups and style improvements
- Low level RPC error code changes (D500 / backport of PR9853)

Low-level RPC changes (D500)
----------------------------

- Error codes have been updated to be more accurate for the following error cases:
  - `getblock` now returns RPC_MISC_ERROR if the block can't be found on disk (for
  example if the block has been pruned). Previously returned RPC_INTERNAL_ERROR.
  - `pruneblockchain` now returns RPC_MISC_ERROR if the blocks cannot be pruned
  because the node is not in pruned mode. Previously returned RPC_METHOD_NOT_FOUND.
  - `pruneblockchain` now returns RPC_INVALID_PARAMETER if the blocks cannot be pruned
  because the supplied timestamp is too late. Previously returned RPC_INTERNAL_ERROR.
  - `pruneblockchain` now returns RPC_MISC_ERROR if the blocks cannot be pruned
  because the blockchain is too short. Previously returned RPC_INTERNAL_ERROR.
  - `setban` now returns RPC_CLIENT_INVALID_IP_OR_SUBNET if the supplied IP address
  or subnet is invalid. Previously returned RPC_CLIENT_NODE_ALREADY_ADDED.
  - `setban` now returns RPC_CLIENT_INVALID_IP_OR_SUBNET if the user tries to unban
  a node that has not previously been banned. Previously returned RPC_MISC_ERROR.
  - `removeprunedfunds` now returns RPC_WALLET_ERROR if bitcoind is unable to remove
  the transaction. Previously returned RPC_INTERNAL_ERROR.
  - `removeprunedfunds` now returns RPC_INVALID_PARAMETER if the transaction does not
  exist in the wallet. Previously returned RPC_INTERNAL_ERROR.
  - `fundrawtransaction` now returns RPC_INVALID_ADDRESS_OR_KEY if an invalid change
  address is provided. Previously returned RPC_INVALID_PARAMETER.
  - `fundrawtransaction` now returns RPC_WALLET_ERROR if bitcoind is unable to create
  the transaction. The error message provides further details. Previously returned
  RPC_INTERNAL_ERROR.
  - The `gettxoutsetinfo` response now contains `disk_size` and `bogosize` instead of
    `bytes_serialized`. The first is a more accurate estimate of actual disk usage, but
    is not deterministic. The second is unrelated to disk usage, but is a
    database-independent metric of UTXO set size: it counts every UTXO entry as 50 + the
    length of its scriptPubKey.

Reserve block space for high priority transactions (D485)
---------------------------------------------------------

By default reserve 5% of the max generated block size parameter to hiprio transactions.
Hence a `bitcoind` instance running with an unmodified configuration will reserve 100K
for high priority transactions. The parameter name used for this configuration
`blockprioritypercentage`. While introducing this new parameter we deprecated
`blockprioritysize`(it was used to specify the amount of high prio reserved area in byte).

A transaction is considered high priority if its priority is higher than this threshold: `COIN * 144 / 250`,
where COIN is the value of a one bitcoin UTXO expressed in satoshis. Thus a transaction
who as an input of 1 bitcoin and are 144 blocks old and whose size is 250 bytes is considered
the priority cut-off.
Bitcoin ABC version 0.14.6 is now available from:

This release includes the following features and fixes:
 - Updated debian packaging
 - Updated FreeBSD build instructions
 - Fix a bug where a node would erroneously increase the ban score of its peers when it hasn't caught up with the chain tip
 - Added various detail about peer misbehaving
 - Add tooling to help maintaing good style for python code
 - Added criptolayer.net DNS seeds
Bitcoin ABC version 0.14.5 is now available from:

This release includes the following features and fixes:

- Enforce strong replay protection (require SIGHASH_FORKID
  and SCRIPT_VERIFY_STRICTENC compliance)
- Change currency units in user interface from BTC -> BCC
- Add NODE_BITCOIN_CASH service bit (0x20)
- Update BU backed seeder to btccash-seeder.bitcoinunlimited.info
- Update ABC logos for About menu, and testnet icon 
- Various refactoring and cleanups

NOTE: Change in default value:
- 'forcednsseed' is enabled by default to increase
  chance of good connection to UAHF network (see D360)
Bitcoin ABC version 0.14.4 is now available from:

This release includes the following features and fixes:

- Further revision of documentation to include correct client identification
- Various code cleanups, refactorings, style and formatting changes
- Update doc/release-process.md for ABC
- Update block that's assumed to be valid
- Various test improvements
- Align ABC spec docs with UAHF specs of 2017-07-16
- Ensure that CDataStream never reads from empty buffers.
Bitcoin ABC version 0.14.3 is now available from:

This release includes the following features and fixes:

- Better identification of client (GUI branding, icons)
- Further revision of documentation to include client identification,
  correct links and remove inapplicable material
- Update bitcoin-tx to produce replay protected signatures
- Update wallet to sign in replay protected manner once fork is active
- Command line help for 'uahfstarttime' option
- Fix a segmentation fault crash that could occur when peers
  disconnecting with high frequency (T64)
Bitcoin ABC version 0.14.2 is now available from:

This release includes various changes. The most notable is a change to the difficulty adjustment algorithm which decreases the difficulty in case the hashrate becomes very low. We obviously hope that this feature will not need to be used, and it would not kick in if the hashrate stays above 8% of the global hashrate. However, it ensures that this chain will survive no matter what, as long as someone thinks it is valuable.
Bitcoin Core version 0.14.1 is now available from:

  <https://bitcoin.org/bin/bitcoin-core-0.14.1/>

This is a new minor version release, including various bugfixes and
performance improvements, as well as updated translations.

Please report bugs using the issue tracker at github:

  <https://github.com/bitcoin/bitcoin/issues>

To receive security and update notifications, please subscribe to:

  <https://bitcoincore.org/en/list/announcements/join/>

Compatibility
==============

Bitcoin Core is extensively tested on multiple operating systems using
the Linux kernel, macOS 10.8+, and Windows Vista and later.

Microsoft ended support for Windows XP on [April 8th, 2014](https://www.microsoft.com/en-us/WindowsForBusiness/end-of-xp-support),
No attempt is made to prevent installing or running the software on Windows XP, you
can still do so at your own risk but be aware that there are known instabilities and issues.
Please do not report issues about Windows XP to the issue tracker.

Bitcoin Core should also work on most other Unix-like systems but is not
frequently tested on them.

Notable changes
===============

RPC changes
-----------

- The first positional argument of `createrawtransaction` was renamed from
  `transactions` to `inputs`.

- The argument of `disconnectnode` was renamed from `node` to `address`.

These interface changes break compatibility with 0.14.0, when the named
arguments functionality, introduced in 0.14.0, is used. Client software
using these calls with named arguments needs to be updated.

Mining
------

In previous versions, getblocktemplate required segwit support from downstream
clients/miners once the feature activated on the network. In this version, it
now supports non-segwit clients even after activation, by removing all segwit
transactions from the returned block template. This allows non-segwit miners to
continue functioning correctly even after segwit has activated.

Due to the limitations in previous versions, getblocktemplate also recommended
non-segwit clients to not signal for the segwit version-bit. Since this is no
longer an issue, getblocktemplate now always recommends signalling segwit for
all miners. This is safe because ability to enforce the rule is the only
required criteria for safe activation, not actually producing segwit-enabled
blocks.

UTXO memory accounting
----------------------

Memory usage for the UTXO cache is being calculated more accurately, so that
the configured limit (`-dbcache`) will be respected when memory usage peaks
during cache flushes.  The memory accounting in prior releases is estimated to
only account for half the actual peak utilization.

The default `-dbcache` has also been changed in this release to 450MiB.  Users
who currently set `-dbcache` to a high value (e.g. to keep the UTXO more fully
cached in memory) should consider increasing this setting in order to achieve
the same cache performance as prior releases.  Users on low-memory systems
(such as systems with 1GB or less) should consider specifying a lower value for
this parameter.

Additional information relating to running on low-memory systems can be found
here:
[reducing-bitcoind-memory-usage.md](https://gist.github.com/laanwj/efe29c7661ce9b6620a7).

0.14.1 Change log
=================

Detailed release notes follow. This overview includes changes that affect
behavior, not code moves, refactors and string updates. For convenience in locating
the code changes and accompanying discussion, both the pull request and
git merge commit are mentioned.

### RPC and other APIs
- #10084 `142fbb2` Rename first named arg of createrawtransaction (MarcoFalke)
- #10139 `f15268d` Remove auth cookie on shutdown (practicalswift)
- #10146 `2fea10a` Better error handling for submitblock (rawodb, gmaxwell)
- #10144 `d947afc` Prioritisetransaction wasn't always updating ancestor fee (sdaftuar)
- #10204 `3c79602` Rename disconnectnode argument (jnewbery)

### Block and transaction handling
- #10126 `0b5e162` Compensate for memory peak at flush time (sipa)
- #9912 `fc3d7db` Optimize GetWitnessHash() for non-segwit transactions (sdaftuar)
- #10133 `ab864d3` Clean up calculations of pcoinsTip memory usage (morcos)

### P2P protocol and network code
- #9953/#10013 `d2548a4` Fix shutdown hang with >= 8 -addnodes set (TheBlueMatt)
- #10176 `30fa231` net: gracefully handle NodeId wrapping (theuni)

### Build system
- #9973 `e9611d1` depends: fix zlib build on osx (theuni)

### GUI
- #10060 `ddc2dd1` Ensure an item exists on the rpcconsole stack before adding (achow101)

### Mining
- #9955/#10006 `569596c` Don't require segwit in getblocktemplate for segwit signalling or mining (sdaftuar)
- #9959/#10127 `b5c3440` Prevent slowdown in CreateNewBlock on large mempools (sdaftuar)

### Tests and QA
- #10157 `55f641c` Fix the `mempool_packages.py` test (sdaftuar)

### Miscellaneous
- #10037 `4d8e660` Trivial: Fix typo in help getrawtransaction RPC (keystrike)
- #10120 `e4c9a90` util: Work around (virtual) memory exhaustion on 32-bit w/ glibc (laanwj)
- #10130 `ecc5232` bitcoin-tx input verification (awemany, jnewbery)

Credits
=======

Thanks to everyone who directly contributed to this release:

- Alex Morcos
- Andrew Chow
- Awemany
- Cory Fields
- Gregory Maxwell
- James Evans
- John Newbery
- MarcoFalke
- Matt Corallo
- Pieter Wuille
- practicalswift
- rawodb
- Suhas Daftuar
- Wladimir J. van der Laan

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).

Bitcoin Core version 0.13.2 is now available from:

  <https://bitcoin.org/bin/bitcoin-core-0.13.2/>

This is a new minor version release, including various bugfixes and
performance improvements, as well as updated translations.

Please report bugs using the issue tracker at github:

  <https://github.com/bitcoin/bitcoin/issues>

To receive security and update notifications, please subscribe to:

  <https://bitcoincore.org/en/list/announcements/join/>

Compatibility
==============

Microsoft ended support for Windows XP on [April 8th, 2014](https://www.microsoft.com/en-us/WindowsForBusiness/end-of-xp-support),
an OS initially released in 2001. This means that not even critical security
updates will be released anymore. Without security updates, using a bitcoin
wallet on a XP machine is irresponsible at least.

In addition to that, with 0.12.x there have been varied reports of Bitcoin Core
randomly crashing on Windows XP. It is [not clear](https://github.com/bitcoin/bitcoin/issues/7681#issuecomment-217439891)
what the source of these crashes is, but it is likely that upstream
libraries such as Qt are no longer being tested on XP.

We do not have time nor resources to provide support for an OS that is
end-of-life. From 0.13.0 on, Windows XP is no longer supported. Users are
suggested to upgrade to a newer version of Windows, or install an alternative OS
that is supported.

No attempt is made to prevent installing or running the software on Windows XP,
you can still do so at your own risk, but do not expect it to work: do not
report issues about Windows XP to the issue tracker.

From 0.13.1 onwards OS X 10.7 is no longer supported. 0.13.0 was intended to work on 10.7+, 
but severe issues with the libc++ version on 10.7.x keep it from running reliably. 
0.13.1 now requires 10.8+, and will communicate that to 10.7 users, rather than crashing unexpectedly.

Notable changes
===============

Change to wallet handling of mempool rejection
-----------------------------------------------

When a newly created transaction failed to enter the mempool due to
the limits on chains of unconfirmed transactions the sending RPC
calls would return an error.  The transaction would still be queued
in the wallet and, once some of the parent transactions were
confirmed, broadcast after the software was restarted.

This behavior has been changed to return success and to reattempt
mempool insertion at the same time transaction rebroadcast is
attempted, avoiding a need for a restart.

Transactions in the wallet which cannot be accepted into the mempool
can be abandoned with the previously existing abandontransaction RPC
(or in the GUI via a context menu on the transaction).


0.13.2 Change log
=================

Detailed release notes follow. This overview includes changes that affect
behavior, not code moves, refactors and string updates. For convenience in locating
the code changes and accompanying discussion, both the pull request and
git merge commit are mentioned.

### Consensus
- #9293 `e591c10` [0.13 Backport #9053] IBD using chainwork instead of height and not using header timestamp (gmaxwell)
- #9053 `5b93eee` IBD using chainwork instead of height and not using header timestamps (gmaxwell)

### RPC and other APIs
- #8845 `1d048b9` Don't return the address of a P2SH of a P2SH (jnewbery)
- #9041 `87fbced` keypoololdest denote Unix epoch, not GMT (s-matthew-english)
- #9122 `f82c81b` fix getnettotals RPC description about timemillis (visvirial)
- #9042 `5bcb05d` [rpc] ParseHash: Fail when length is not 64 (MarcoFalke)
- #9194 `f26dab7` Add option to return non-segwit serialization via rpc (instagibbs)
- #9347 `b711390` [0.13.2] wallet/rpc backports (MarcoFalke)
- #9292 `c365556` Complain when unknown rpcserialversion is specified (sipa)
- #9322 `49a612f` [qa] Don't set unknown rpcserialversion (MarcoFalke)

### Block and transaction handling
- #8357 `ce0d817` [mempool] Fix relaypriority calculation error (maiiz)
- #9267 `0a4aa87` [0.13 backport #9239] Disable fee estimates for a confirm target of 1 block (morcos)
- #9196 `0c09d9f` Send tip change notification from invalidateblock (ryanofsky)

### P2P protocol and network code
- #8995 `9ef3875` Add missing cs_main lock to ::GETBLOCKTXN processing (TheBlueMatt)
- #9234 `94531b5` torcontrol: Explicitly request RSA1024 private key (laanwj)
- #8637 `2cad5db` Compact Block Tweaks (rebase of #8235) (sipa)
- #9058 `286e548` Fixes for p2p-compactblocks.py test timeouts on travis (#8842) (ryanofsky)
- #8865 `4c71fc4` Decouple peer-processing-logic from block-connection-logic (TheBlueMatt)
- #9117 `6fe3981` net: don't send feefilter messages before the version handshake is complete (theuni)
- #9188 `ca1fd75` Make orphan parent fetching ask for witnesses (gmaxwell)
- #9052 `3a3bcbf` Use RelevantServices instead of node_network in AttemptToEvict (gmaxwell)
- #9048 `9460771` [0.13 backport #9026] Fix handling of invalid compact blocks (sdaftuar)
- #9357 `03b6f62` [0.13 backport #9352] Attempt reconstruction from all compact block announcements (sdaftuar)
- #9189 `b96a8f7` Always add default_witness_commitment with GBT client support (sipa)
- #9253 `28d0f22` Fix calculation of number of bound sockets to use (TheBlueMatt)
- #9199 `da5a16b` Always drop the least preferred HB peer when adding a new one (gmaxwell)

### Build system
- #9169 `d1b4da9` build: fix qt5.7 build under macOS (theuni)
- #9326 `a0f7ece` Update for OpenSSL 1.1 API (gmaxwell)
- #9224 `396c405` Prevent FD_SETSIZE error building on OpenBSD (ivdsangen)

### GUI
- #8972 `6f86b53` Make warnings label selectable (jonasschnelli) (MarcoFalke)
- #9185 `6d70a73` Fix coincontrol sort issue (jonasschnelli)
- #9094 `5f3a12c` Use correct conversion function for boost::path datadir (laanwj)
- #8908 `4a974b2` Update bitcoin-qt.desktop (s-matthew-english)
- #9190 `dc46b10` Plug many memory leaks (laanwj)

### Wallet
- #9290 `35174a0` Make RelayWalletTransaction attempt to AcceptToMemoryPool (gmaxwell)
- #9295 `43bcfca` Bugfix: Fundrawtransaction: don't terminate when keypool is empty (jonasschnelli)
- #9302 `f5d606e` Return txid even if ATMP fails for new transaction (sipa)
- #9262 `fe39f26` Prefer coins that have fewer ancestors, sanity check txn before ATMP (instagibbs)

### Tests and QA
- #9159 `eca9b46` Wait for specific block announcement in p2p-compactblocks (ryanofsky)
- #9186 `dccdc3a` Fix use-after-free in scheduler tests (laanwj)
- #9168 `3107280` Add assert_raises_message to check specific error message (mrbandrews)
- #9191 `29435db` 0.13.2 Backports (MarcoFalke)
- #9077 `1d4c884` Increase wallet-dump RPC timeout (ryanofsky)
- #9098 `ecd7db5` Handle zombies and cluttered tmpdirs (MarcoFalke)
- #8927 `387ec9d` Add script tests for FindAndDelete in pre-segwit and segwit scripts (jl2012)
- #9200 `eebc699` bench: Fix subtle counting issue when rescaling iteration count (laanwj)

### Miscellaneous
- #8838 `094848b` Calculate size and weight of block correctly in CreateNewBlock() (jnewbery)
- #8920 `40169dc` Set minimum required Boost to 1.47.0 (fanquake)
- #9251 `a710a43` Improvement of documentation of command line parameter 'whitelist' (wodry)
- #8932 `106da69` Allow bitcoin-tx to create v2 transactions (btcdrak)
- #8929 `12428b4` add software-properties-common (sigwo)
- #9120 `08d1c90` bug: Missed one "return false" in recent refactoring in #9067 (UdjinM6)
- #9067 `f85ee01` Fix exit codes (UdjinM6)
- #9340 `fb987b3` [0.13] Update secp256k1 subtree (MarcoFalke)
- #9229 `b172377` Remove calls to getaddrinfo_a (TheBlueMatt)

Credits
=======

Thanks to everyone who directly contributed to this release:

- Alex Morcos
- BtcDrak
- Cory Fields
- fanquake
- Gregory Maxwell
- Gregory Sanders
- instagibbs
- Ivo van der Sangen
- jnewbery
- Johnson Lau
- Jonas Schnelli
- Luke Dashjr
- maiiz
- MarcoFalke
- Masahiko Hyuga
- Matt Corallo
- matthias
- mrbandrews
- Pavel Janík
- Pieter Wuille
- randy-waterhouse
- Russell Yanofsky
- S. Matthew English
- Steven
- Suhas Daftuar
- UdjinM6
- Wladimir J. van der Laan
- wodry

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).
Bitcoin Core version 0.13.1 is now available from:

  <https://bitcoin.org/bin/bitcoin-core-0.13.1/>

This is a new minor version release, including activation parameters for the
segwit softfork, various bugfixes and performance improvements, as well as
updated translations.

Please report bugs using the issue tracker at github:

  <https://github.com/bitcoin/bitcoin/issues>

To receive security and update notifications, please subscribe to:

  <https://bitcoincore.org/en/list/announcements/join/>

Compatibility
==============

Microsoft ended support for Windows XP on [April 8th, 2014](https://www.microsoft.com/en-us/WindowsForBusiness/end-of-xp-support),
an OS initially released in 2001. This means that not even critical security
updates will be released anymore. Without security updates, using a bitcoin
wallet on a XP machine is irresponsible at least.

In addition to that, with 0.12.x there have been varied reports of Bitcoin Core
randomly crashing on Windows XP. It is [not clear](https://github.com/bitcoin/bitcoin/issues/7681#issuecomment-217439891)
what the source of these crashes is, but it is likely that upstream
libraries such as Qt are no longer being tested on XP.

We do not have time nor resources to provide support for an OS that is
end-of-life. From 0.13.0 on, Windows XP is no longer supported. Users are
suggested to upgrade to a newer version of Windows, or install an alternative OS
that is supported.

No attempt is made to prevent installing or running the software on Windows XP,
you can still do so at your own risk, but do not expect it to work: do not
report issues about Windows XP to the issue tracker.

From 0.13.1 onwards OS X 10.7 is no longer supported. 0.13.0 was intended to work on 10.7+, 
but severe issues with the libc++ version on 10.7.x keep it from running reliably. 
0.13.1 now requires 10.8+, and will communicate that to 10.7 users, rather than crashing unexpectedly.

Notable changes
===============

Segregated witness soft fork
----------------------------

Segregated witness (segwit) is a soft fork that, if activated, will
allow transaction-producing software to separate (segregate) transaction
signatures (witnesses) from the part of the data in a transaction that is
covered by the txid. This provides several immediate benefits:

- **Elimination of unwanted transaction malleability:** Segregating the witness
  allows both existing and upgraded software to calculate the transaction
  identifier (txid) of transactions without referencing the witness, which can
  sometimes be changed by third-parties (such as miners) or by co-signers in a
  multisig spend. This solves all known cases of unwanted transaction
  malleability, which is a problem that makes programming Bitcoin wallet
  software more difficult and which seriously complicates the design of smart
  contracts for Bitcoin.

- **Capacity increase:** Segwit transactions contain new fields that are not
  part of the data currently used to calculate the size of a block, which
  allows a block containing segwit transactions to hold more data than allowed
  by the current maximum block size. Estimates based on the transactions
  currently found in blocks indicate that if all wallets switch to using
  segwit, the network will be able to support about 70% more transactions. The
  network will also be able to support more of the advanced-style payments
  (such as multisig) than it can support now because of the different weighting
  given to different parts of a transaction after segwit activates (see the
  following section for details).

- **Weighting data based on how it affects node performance:** Some parts of
  each Bitcoin block need to be stored by nodes in order to validate future
  blocks; other parts of a block can be immediately forgotten (pruned) or used
  only for helping other nodes sync their copy of the block chain.  One large
  part of the immediately prunable data are transaction signatures (witnesses),
  and segwit makes it possible to give a different "weight" to segregated
  witnesses to correspond with the lower demands they place on node resources.
  Specifically, each byte of a segregated witness is given a weight of 1, each
  other byte in a block is given a weight of 4, and the maximum allowed weight
  of a block is 4 million.  Weighting the data this way better aligns the most
  profitable strategy for creating blocks with the long-term costs of block
  validation.

- **Signature covers value:** A simple improvement in the way signatures are
  generated in segwit simplifies the design of secure signature generators
  (such as hardware wallets), reduces the amount of data the signature
  generator needs to download, and allows the signature generator to operate
  more quickly.  This is made possible by having the generator sign the amount
  of bitcoins they think they are spending, and by having full nodes refuse to
  accept those signatures unless the amount of bitcoins being spent is exactly
  the same as was signed.  For non-segwit transactions, wallets instead had to
  download the complete previous transactions being spent for every payment
  they made, which could be a slow operation on hardware wallets and in other
  situations where bandwidth or computation speed was constrained.

- **Linear scaling of sighash operations:** In 2015 a block was produced that
  required about 25 seconds to validate on modern hardware because of the way
  transaction signature hashes are performed.  Other similar blocks, or blocks
  that could take even longer to validate, can still be produced today.  The
  problem that caused this can't be fixed in a soft fork without unwanted
  side-effects, but transactions that opt-in to using segwit will now use a
  different signature method that doesn't suffer from this problem and doesn't
  have any unwanted side-effects.

- **Increased security for multisig:** Bitcoin addresses (both P2PKH addresses
  that start with a '1' and P2SH addresses that start with a '3') use a hash
  function known as RIPEMD-160.  For P2PKH addresses, this provides about 160
  bits of security---which is beyond what cryptographers believe can be broken
  today.  But because P2SH is more flexible, only about 80 bits of security is
  provided per address. Although 80 bits is very strong security, it is within
  the realm of possibility that it can be broken by a powerful adversary.
  Segwit allows advanced transactions to use the SHA256 hash function instead,
  which provides about 128 bits of security  (that is 281 trillion times as
  much security as 80 bits and is equivalent to the maximum bits of security
  believed to be provided by Bitcoin's choice of parameters for its Elliptic
  Curve Digital Security Algorithm [ECDSA].)

- **More efficient almost-full-node security** Satoshi Nakamoto's original
  Bitcoin paper describes a method for allowing newly-started full nodes to
  skip downloading and validating some data from historic blocks that are
  protected by large amounts of proof of work.  Unfortunately, Nakamoto's
  method can't guarantee that a newly-started node using this method will
  produce an accurate copy of Bitcoin's current ledger (called the UTXO set),
  making the node vulnerable to falling out of consensus with other nodes.
  Although the problems with Nakamoto's method can't be fixed in a soft fork,
  Segwit accomplishes something similar to his original proposal: it makes it
  possible for a node to optionally skip downloading some blockchain data
  (specifically, the segregated witnesses) while still ensuring that the node
  can build an accurate copy of the UTXO set for the block chain with the most
  proof of work.  Segwit enables this capability at the consensus layer, but
  note that Bitcoin Core does not provide an option to use this capability as
  of this 0.13.1 release.

- **Script versioning:** Segwit makes it easy for future soft forks to allow
  Bitcoin users to individually opt-in to almost any change in the Bitcoin
  Script language when those users receive new transactions.  Features
  currently being researched by Bitcoin Core contributors that may use this
  capability include support for Schnorr signatures, which can improve the
  privacy and efficiency of multisig transactions (or transactions with
  multiple inputs), and Merklized Abstract Syntax Trees (MAST), which can
  improve the privacy and efficiency of scripts with two or more conditions.
  Other Bitcoin community members are studying several other improvements
  that can be made using script versioning.

Activation for the segwit soft fork is being managed using BIP9
versionbits.  Segwit's version bit is bit 1, and nodes will begin
tracking which blocks signal support for segwit at the beginning of the
first retarget period after segwit's start date of 15 November 2016.  If
95% of blocks within a 2,016-block retarget period (about two weeks)
signal support for segwit, the soft fork will be locked in.  After
another 2,016 blocks, segwit will activate.

For more information about segwit, please see the [segwit FAQ][], the
[segwit wallet developers guide][] or BIPs [141][BIP141], [143][BIP143],
[144][BIP144], and [145][BIP145].  If you're a miner or mining pool
operator, please see the [versionbits FAQ][] for information about
signaling support for a soft fork.

[Segwit FAQ]: https://bitcoincore.org/en/2016/01/26/segwit-benefits/
[segwit wallet developers guide]: https://bitcoincore.org/en/segwit_wallet_dev/
[BIP141]: https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki
[BIP143]: https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki
[BIP144]: https://github.com/bitcoin/bips/blob/master/bip-0144.mediawiki
[BIP145]: https://github.com/bitcoin/bips/blob/master/bip-0145.mediawiki
[versionbits FAQ]: https://bitcoincore.org/en/2016/06/08/version-bits-miners-faq/


Null dummy soft fork
-------------------

Combined with the segwit soft fork is an additional change that turns a
long-existing network relay policy into a consensus rule. The
`OP_CHECKMULTISIG` and `OP_CHECKMULTISIGVERIFY` opcodes consume an extra
stack element ("dummy element") after signature validation. The dummy
element is not inspected in any manner, and could be replaced by any
value without invalidating the script.

Because any value can be used for this dummy element, it's possible for
a third-party to insert data into other people's transactions, changing
the transaction's txid (called transaction malleability) and possibly
causing other problems.

Since Bitcoin Core 0.10.0, nodes have defaulted to only relaying and
mining transactions whose dummy element was a null value (0x00, also
called OP_0).  The null dummy soft fork turns this relay rule into a
consensus rule both for non-segwit transactions and segwit transactions,
so that this method of mutating transactions is permanently eliminated
from the network.

Signaling for the null dummy soft fork is done by signaling support
for segwit, and the null dummy soft fork will activate at the same time
as segwit.

For more information, please see [BIP147][].

[BIP147]: https://github.com/bitcoin/bips/blob/master/bip-0147.mediawiki

Low-level RPC changes
---------------------

- `importprunedfunds` only accepts two required arguments. Some versions accept
  an optional third arg, which was always ignored. Make sure to never pass more
  than two arguments.


Linux ARM builds
----------------

With the 0.13.0 release, pre-built Linux ARM binaries were added to the set of
uploaded executables. Additional detail on the ARM architecture targeted by each
is provided below.

The following extra files can be found in the download directory or torrent:

- `bitcoin-${VERSION}-arm-linux-gnueabihf.tar.gz`: Linux binaries targeting
  the 32-bit ARMv7-A architecture.
- `bitcoin-${VERSION}-aarch64-linux-gnu.tar.gz`: Linux binaries targeting
  the 64-bit ARMv8-A architecture.

ARM builds are still experimental. If you have problems on a certain device or
Linux distribution combination please report them on the bug tracker, it may be
possible to resolve them. Note that the device you use must be (backward)
compatible with the architecture targeted by the binary that you use.
For example, a Raspberry Pi 2 Model B or Raspberry Pi 3 Model B (in its 32-bit
execution state) device, can run the 32-bit ARMv7-A targeted binary. However,
no model of Raspberry Pi 1 device can run either binary because they are all
ARMv6 architecture devices that are not compatible with ARMv7-A or ARMv8-A.

Note that Android is not considered ARM Linux in this context. The executables
are not expected to work out of the box on Android.


0.13.1 Change log
=================

Detailed release notes follow. This overview includes changes that affect
behavior, not code moves, refactors and string updates. For convenience in locating
the code changes and accompanying discussion, both the pull request and
git merge commit are mentioned.

### Consensus
- #8636 `9dfa0c8` Implement NULLDUMMY softfork (BIP147) (jl2012)
- #8848 `7a34a46` Add NULLDUMMY verify flag in bitcoinconsensus.h (jl2012)
- #8937 `8b66659` Define start and end time for segwit deployment (sipa)

### RPC and other APIs
- #8581 `526d2b0` Drop misleading option in importprunedfunds (MarcoFalke)
- #8699 `a5ec248` Remove createwitnessaddress RPC command (jl2012)
- #8780 `794b007` Deprecate getinfo (MarcoFalke)
- #8832 `83ad563` Throw JSONRPCError when utxo set can not be read (MarcoFalke)
- #8884 `b987348` getblockchaininfo help: pruneheight is the lowest, not highest, block (luke-jr)
- #8858 `3f508ed` rpc: Generate auth cookie in hex instead of base64 (laanwj)
- #8951 `7c2bf4b` RPC/Mining: getblocktemplate: Update and fix formatting of help (luke-jr)

### Block and transaction handling
- #8611 `a9429ca` Reduce default number of blocks to check at startup (sipa)
- #8634 `3e80ab7` Add policy: null signature for failed CHECK(MULTI)SIG (jl2012)
- #8525 `1672225` Do not store witness txn in rejection cache (sipa)
- #8499 `9777fe1` Add several policy limits and disable uncompressed keys for segwit scripts (jl2012)
- #8526 `0027672` Make non-minimal OP_IF/NOTIF argument non-standard for P2WSH (jl2012)
- #8524 `b8c79a0` Precompute sighashes (sipa)
- #8651 `b8c79a0` Predeclare PrecomputedTransactionData as struct (sipa)

### P2P protocol and network code
- #8740 `42ea51a` No longer send local address in addrMe (laanwj)
- #8427 `69d1cd2` Ignore `notfound` P2P messages (laanwj)
- #8573 `4f84082` Set jonasschnellis dns-seeder filter flag (jonasschnelli)
- #8712 `23feab1` Remove maxuploadtargets recommended minimum (jonasschnelli)
- #8862 `7ae6242` Fix a few cases where messages were sent after requested disconnect (theuni)
- #8393 `fe1975a` Support for compact blocks together with segwit (sipa)
- #8282 `2611ad7` Feeler connections to increase online addrs in the tried table (EthanHeilman)
- #8612 `2215c22` Check for compatibility with download in FindNextBlocksToDownload (sipa)
- #8606 `bbf379b` Fix some locks (sipa)
- #8594 `ab295bb` Do not add random inbound peers to addrman (gmaxwell)
- #8940 `5b4192b` Add x9 service bit support to dnsseed.bluematt.me, seed.bitcoinstats.com (TheBlueMatt, cdecker)
- #8944 `685e4c7` Remove bogus assert on number of oubound connections. (TheBlueMatt)
- #8949 `0dbc48a` Be more agressive in getting connections to peers with relevant services (gmaxwell)

### Build system
- #8293 `fa5b249` Allow building libbitcoinconsensus without any univalue (luke-jr)
- #8492 `8b0bdd3` Allow building bench_bitcoin by itself (luke-jr)
- #8563 `147003c` Add configure check for -latomic (ajtowns)
- #8626 `ea51b0f` Berkeley DB v6 compatibility fix (netsafe)
- #8520 `75f2065` Remove check for `openssl/ec.h` (laanwj)

### GUI
- #8481 `d9f0d4e` Fix minimize and close bugs (adlawren)
- #8487 `a37cec5` Persist the datadir after option reset (achow101)
- #8697 `41fd852` Fix op order to append first alert (rodasmith)
- #8678 `8e03382` Fix UI bug that could result in paying unexpected fee (jonasschnelli)
- #8911 `7634d8e` Translate all files, even if wallet disabled (laanwj)
- #8540 `1db3352` Fix random segfault when closing "Choose data directory" dialog (laanwj)
- #7579 `f1c0d78` Show network/chain errors in the GUI (jonasschnelli)

### Wallet
- #8443 `464dedd` Trivial cleanup of HD wallet changes (jonasschnelli)
- #8539 `cb07f19` CDB: fix debug output (crowning-)
- #8664 `091cdeb` Fix segwit-related wallet bug (sdaftuar)
- #8693 `c6a6291` Add witness address to address book (instagibbs)
- #8765 `6288659` Remove "unused" ThreadFlushWalletDB from removeprunedfunds (jonasschnelli)

### Tests and QA
- #8713 `ae8c7df` create_cache: Delete temp dir when done (MarcoFalke)
- #8716 `e34374e` Check legacy wallet as well (MarcoFalke)
- #8750 `d6ebe13` Refactor RPCTestHandler to prevent TimeoutExpired (MarcoFalke)
- #8652 `63462c2` remove root test directory for RPC tests (yurizhykin)
- #8724 `da94272` walletbackup: Sync blocks inside the loop (MarcoFalke)
- #8400 `bea02dc` enable rpcbind_test (yurizhykin)
- #8417 `f70be14` Add walletdump RPC test (including HD- & encryption-tests) (jonasschnelli)
- #8419 `a7aa3cc` Enable size accounting in mining unit tests (sdaftuar)
- #8442 `8bb1efd` Rework hd wallet dump test (MarcoFalke)
- #8528 `3606b6b` Update p2p-segwit.py to reflect correct behavior (instagibbs)
- #8531 `a27cdd8` abandonconflict: Use assert_equal (MarcoFalke)
- #8667 `6b07362` Fix SIGHASH_SINGLE bug in test_framework SignatureHash (jl2012)
- #8673 `03b0196` Fix obvious assignment/equality error in test (JeremyRubin)
- #8739 `cef633c` Fix broken sendcmpct test in p2p-compactblocks.py (sdaftuar)
- #8418 `ff893aa` Add tests for compact blocks (sdaftuar)
- #8803 `375437c` Ping regularly in p2p-segwit.py to keep connection alive (jl2012)
- #8827 `9bbe66e` Split up slow RPC calls to avoid pruning test timeouts (sdaftuar)
- #8829 `2a8bca4` Add bitcoin-tx JSON tests (jnewbery)
- #8834 `1dd1783` blockstore: Switch to dumb dbm (MarcoFalke)
- #8835 `d87227d` nulldummy.py: Don't run unused code (MarcoFalke)
- #8836 `eb18cc1` bitcoin-util-test.py should fail if the output file is empty (jnewbery)
- #8839 `31ab2f8` Avoid ConnectionResetErrors during RPC tests (laanwj)
- #8840 `cbc3fe5` Explicitly set encoding to utf8 when opening text files (laanwj)
- #8841 `3e4abb5` Fix nulldummy test (jl2012)
- #8854 `624a007` Fix race condition in p2p-compactblocks test (sdaftuar)
- #8857 `1f60d45` mininode: Only allow named args in wait_until (MarcoFalke)
- #8860 `0bee740` util: Move wait_bitcoinds() into stop_nodes() (MarcoFalke)
- #8882 `b73f065` Fix race conditions in p2p-compactblocks.py and sendheaders.py (sdaftuar)
- #8904 `cc6f551` Fix compact block shortids for a test case (dagurval)

### Documentation
- #8754 `0e2c6bd` Target protobuf 2.6 in OS X build notes. (fanquake)
- #8461 `b17a3f9` Document return value of networkhashps for getmininginfo RPC endpoint (jlopp)
- #8512 `156e305` Corrected JSON typo on setban of net.cpp (sevastos)
- #8683 `8a7d7ff` Fix incorrect file name bitcoin.qrc  (bitcoinsSG)
- #8891 `5e0dd9e` Update bips.md for Segregated Witness (fanquake)
- #8545 `863ae74` Update git-subtree-check.sh README (MarcoFalke)
- #8607 `486650a` Fix doxygen off-by-one comments, fix typos (MarcoFalke)
- #8560 `c493f43` Fix two VarInt examples in serialize.h (cbarcenas)
- #8737 `084cae9` UndoReadFromDisk works on undo files (rev), not on block files (paveljanik)
- #8625 `0a35573` Clarify statement about parallel jobs in rpc-tests.py (isle2983)
- #8624 `0e6d753` build: Mention curl (MarcoFalke)
- #8604 `b09e13c` build,doc: Update for 0.13.0+ and OpenBSD 5.9 (laanwj)
- #8939 `06d15fb` Update implemented bips for 0.13.1 (sipa)

### Miscellaneous
- #8742 `d31ac72` Specify Protobuf version 2 in paymentrequest.proto (fanquake)
- #8414,#8558,#8676,#8700,#8701,#8702 Add missing copyright headers (isle2983, kazcw)
- #8899 `4ed2627` Fix wake from sleep issue with Boost 1.59.0 (fanquake)
- #8817 `bcf3806` update bitcoin-tx to output witness data (jnewbery)
- #8513 `4e5fc31` Fix a type error that would not compile on OSX. (JeremyRubin)
- #8392 `30eac2d` Fix several node initialization issues (sipa)
- #8548 `305d8ac` Use `__func__` to get function name for output printing (MarcoFalke)
- #8291 `a987431` [util] CopyrightHolders: Check for untranslated substitution (MarcoFalke)

Credits
=======

Thanks to everyone who directly contributed to this release:

- adlawren
- Alexey Vesnin
- Anders Øyvind Urke-Sætre
- Andrew Chow
- Anthony Towns
- BtcDrak
- Chris Stewart
- Christian Barcenas
- Christian Decker
- Cory Fields
- crowning-
- Dagur Valberg Johannsson
- David A. Harding
- Eric Lombrozo
- Ethan Heilman
- fanquake
- Gaurav Rana
- Gregory Maxwell
- instagibbs
- isle2983
- Jameson Lopp
- Jeremy Rubin
- jnewbery
- Johnson Lau
- Jonas Schnelli
- jonnynewbs
- Justin Camarena
- Kaz Wesley
- leijurv
- Luke Dashjr
- MarcoFalke
- Marty Jones
- Matt Corallo
- Micha
- Michael Ford
- mruddy
- Pavel Janík
- Pieter Wuille
- rodasmith
- Sev
- Suhas Daftuar
- whythat
- Wladimir J. van der Laan

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).
Bitcoin Core version 0.13.0 is now available from:

  <https://bitcoin.org/bin/bitcoin-core-0.13.0/>

This is a new major version release, including new features, various bugfixes
and performance improvements, as well as updated translations.

Please report bugs using the issue tracker at github:

  <https://github.com/bitcoin/bitcoin/issues>

To receive security and update notifications, please subscribe to:

  <https://bitcoincore.org/en/list/announcements/join/>

Compatibility
==============

Microsoft ended support for Windows XP on [April 8th, 2014](https://www.microsoft.com/en-us/WindowsForBusiness/end-of-xp-support),
an OS initially released in 2001. This means that not even critical security
updates will be released anymore. Without security updates, using a bitcoin
wallet on a XP machine is irresponsible at least.

In addition to that, with 0.12.x there have been varied reports of Bitcoin Core
randomly crashing on Windows XP. It is [not clear](https://github.com/bitcoin/bitcoin/issues/7681#issuecomment-217439891)
what the source of these crashes is, but it is likely that upstream
libraries such as Qt are no longer being tested on XP.

We do not have time nor resources to provide support for an OS that is
end-of-life. From 0.13.0 on, Windows XP is no longer supported. Users are
suggested to upgrade to a newer verion of Windows, or install an alternative OS
that is supported.

No attempt is made to prevent installing or running the software on Windows XP,
you can still do so at your own risk, but do not expect it to work: do not
report issues about Windows XP to the issue tracker.

Notable changes
===============

Database cache memory increased
--------------------------------

As a result of growth of the UTXO set, performance with the prior default
database cache of 100 MiB has suffered.
For this reason the default was changed to 300 MiB in this release.

For nodes on low-memory systems, the database cache can be changed back to
100 MiB (or to another value) by either:

- Adding `dbcache=100` in bitcoin.conf
- Changing it in the GUI under `Options → Size of database cache`

Note that the database cache setting has the most performance impact
during initial sync of a node, and when catching up after downtime.


bitcoin-cli: arguments privacy
------------------------------

The RPC command line client gained a new argument, `-stdin`
to read extra arguments from standard input, one per line until EOF/Ctrl-D.
For example:

    $ src/bitcoin-cli -stdin walletpassphrase
    mysecretcode
    120
    ..... press Ctrl-D here to end input
    $

It is recommended to use this for sensitive information such as wallet
passphrases, as command-line arguments can usually be read from the process
table by any user on the system.


C++11 and Python 3
------------------

Various code modernizations have been done. The Bitcoin Core code base has
started using C++11. This means that a C++11-capable compiler is now needed for
building. Effectively this means GCC 4.7 or higher, or Clang 3.3 or higher.

When cross-compiling for a target that doesn't have C++11 libraries, configure with
`./configure --enable-glibc-back-compat ... LDFLAGS=-static-libstdc++`.

For running the functional tests in `qa/rpc-tests`, Python3.4 or higher is now
required.


Linux ARM builds
----------------

Due to popular request, Linux ARM builds have been added to the uploaded
executables.

The following extra files can be found in the download directory or torrent:

- `bitcoin-${VERSION}-arm-linux-gnueabihf.tar.gz`: Linux binaries targeting
  the 32-bit ARMv7-A architecture.
- `bitcoin-${VERSION}-aarch64-linux-gnu.tar.gz`: Linux binaries targeting
  the 64-bit ARMv8-A architecture.

ARM builds are still experimental. If you have problems on a certain device or
Linux distribution combination please report them on the bug tracker, it may be
possible to resolve them. Note that the device you use must be (backward)
compatible with the architecture targeted by the binary that you use.
For example, a Raspberry Pi 2 Model B or Raspberry Pi 3 Model B (in its 32-bit
execution state) device, can run the 32-bit ARMv7-A targeted binary. However,
no model of Raspberry Pi 1 device can run either binary because they are all
ARMv6 architecture devices that are not compatible with ARMv7-A or ARMv8-A.

Note that Android is not considered ARM Linux in this context. The executables
are not expected to work out of the box on Android.


Compact Block support (BIP 152)
-------------------------------

Support for block relay using the Compact Blocks protocol has been implemented
in PR 8068.

The primary goal is reducing the bandwidth spikes at relay time, though in many
cases it also reduces propagation delay. It is automatically enabled between
compatible peers.
[BIP 152](https://github.com/bitcoin/bips/blob/master/bip-0152.mediawiki)

As a side-effect, ordinary non-mining nodes will download and upload blocks
faster if those blocks were produced by miners using similar transaction
filtering policies. This means that a miner who produces a block with many
transactions discouraged by your node will be relayed slower than one with
only transactions already in your memory pool. The overall effect of such
relay differences on the network may result in blocks which include widely-
discouraged transactions losing a stale block race, and therefore miners may
wish to configure their node to take common relay policies into consideration.


Hierarchical Deterministic Key Generation
-----------------------------------------
Newly created wallets will use hierarchical deterministic key generation
according to BIP32 (keypath m/0'/0'/k').
Existing wallets will still use traditional key generation.

Backups of HD wallets, regardless of when they have been created, can
therefore be used to re-generate all possible private keys, even the
ones which haven't already been generated during the time of the backup.
**Attention:** Encrypting the wallet will create a new seed which requires
a new backup!

Wallet dumps (created using the `dumpwallet` RPC) will contain the deterministic
seed. This is expected to allow future versions to import the seed and all
associated funds, but this is not yet implemented.

HD key generation for new wallets can be disabled by `-usehd=0`. Keep in
mind that this flag only has affect on newly created wallets.
You can't disable HD key generation once you have created a HD wallet.

There is no distinction between internal (change) and external keys.

HD wallets are incompatible with older versions of Bitcoin Core.

[Pull request](https://github.com/bitcoin/bitcoin/pull/8035/files), [BIP 32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)


Segregated Witness
------------------

The code preparations for Segregated Witness ("segwit"), as described in [BIP
141](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki), [BIP
143](https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki), [BIP
144](https://github.com/bitcoin/bips/blob/master/bip-0144.mediawiki), and [BIP
145](https://github.com/bitcoin/bips/blob/master/bip-0145.mediawiki) are
finished and included in this release.  However, BIP 141 does not yet specify
activation parameters on mainnet, and so this release does not support segwit
use on mainnet.  Testnet use is supported, and after BIP 141 is updated with
proposed parameters, a future release of Bitcoin Core is expected that
implements those parameters for mainnet.

Furthermore, because segwit activation is not yet specified for mainnet,
version 0.13.0 will behave similarly as other pre-segwit releases even after a
future activation of BIP 141 on the network.  Upgrading from 0.13.0 will be
required in order to utilize segwit-related features on mainnet (such as signal
BIP 141 activation, mine segwit blocks, fully validate segwit blocks, relay
segwit blocks to other segwit nodes, and use segwit transactions in the
wallet, etc).


Mining transaction selection ("Child Pays For Parent")
------------------------------------------------------

The mining transaction selection algorithm has been replaced with an algorithm
that selects transactions based on their feerate inclusive of unconfirmed
ancestor transactions.  This means that a low-fee transaction can become more
likely to be selected if a high-fee transaction that spends its outputs is
relayed.

With this change, the `-blockminsize` command line option has been removed.

The command line option `-blockmaxsize` remains an option to specify the
maximum number of serialized bytes in a generated block.  In addition, the new
command line option `-blockmaxweight` has been added, which specifies the
maximum "block weight" of a generated block, as defined by [BIP 141 (Segregated
Witness)] (https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki).

In preparation for Segregated Witness, the mining algorithm has been modified
to optimize transaction selection for a given block weight, rather than a given
number of serialized bytes in a block.  In this release, transaction selection
is unaffected by this distinction (as BIP 141 activation is not supported on
mainnet in this release, see above), but in future releases and after BIP 141
activation, these calculations would be expected to differ.

For optimal runtime performance, miners using this release should specify
`-blockmaxweight` on the command line, and not specify `-blockmaxsize`.
Additionally (or only) specifying `-blockmaxsize`, or relying on default
settings for both, may result in performance degradation, as the logic to
support `-blockmaxsize` performs additional computation to ensure that
constraint is met.  (Note that for mainnet, in this release, the equivalent
parameter for `-blockmaxweight` would be four times the desired
`-blockmaxsize`.  See [BIP 141]
(https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki) for additional
details.)

In the future, the `-blockmaxsize` option may be removed, as block creation is
no longer optimized for this metric.  Feedback is requested on whether to
deprecate or keep this command line option in future releases.


Reindexing changes
------------------

In earlier versions, reindexing did validation while reading through the block
files on disk. These two have now been split up, so that all blocks are known
before validation starts. This was necessary to make certain optimizations that
are available during normal synchronizations also available during reindexing.

The two phases are distinct in the Bitcoin-Qt GUI. During the first one,
"Reindexing blocks on disk" is shown. During the second (slower) one,
"Processing blocks on disk" is shown.

It is possible to only redo validation now, without rebuilding the block index,
using the command line option `-reindex-chainstate` (in addition to
`-reindex` which does both). This new option is useful when the blocks on disk
are assumed to be fine, but the chainstate is still corrupted. It is also
useful for benchmarks.


Removal of internal miner
--------------------------

As CPU mining has been useless for a long time, the internal miner has been
removed in this release, and replaced with a simpler implementation for the
test framework.

The overall result of this is that `setgenerate` RPC call has been removed, as
well as the `-gen` and `-genproclimit` command-line options.

For testing, the `generate` call can still be used to mine a block, and a new
RPC call `generatetoaddress` has been added to mine to a specific address. This
works with wallet disabled.


New bytespersigop implementation
--------------------------------

The former implementation of the bytespersigop filter accidentally broke bare
multisig (which is meant to be controlled by the `permitbaremultisig` option),
since the consensus protocol always counts these older transaction forms as 20
sigops for backwards compatibility. Simply fixing this bug by counting more
accurately would have reintroduced a vulnerability. It has therefore been
replaced with a new implementation that rather than filter such transactions,
instead treats them (for fee purposes only) as if they were in fact the size
of a transaction actually using all 20 sigops.


Low-level P2P changes
----------------------

- The optional new p2p message "feefilter" is implemented and the protocol
  version is bumped to 70013. Upon receiving a feefilter message from a peer,
  a node will not send invs for any transactions which do not meet the filter
  feerate. [BIP 133](https://github.com/bitcoin/bips/blob/master/bip-0133.mediawiki)

- The P2P alert system has been removed in PR #7692 and the `alert` P2P message
  is no longer supported.

- The transaction relay mechanism used to relay one quarter of all transactions
  instantly, while queueing up the rest and sending them out in batch. As
  this resulted in chains of dependent transactions being reordered, it
  systematically hurt transaction relay. The relay code was redesigned in PRs
  \#7840 and #8082, and now always batches transactions announcements while also
  sorting them according to dependency order. This significantly reduces orphan
  transactions. To compensate for the removal of instant relay, the frequency of
  batch sending was doubled for outgoing peers.

- Since PR #7840 the BIP35 `mempool` command is also subject to batch processing.
  Also the `mempool` message is no longer handled for non-whitelisted peers when
  `NODE_BLOOM` is disabled through `-peerbloomfilters=0`.

- The maximum size of orphan transactions that are kept in memory until their
  ancestors arrive has been raised in PR #8179 from 5000 to 99999 bytes. They
  are now also removed from memory when they are included in a block, conflict
  with a block, and time out after 20 minutes.

- We respond at most once to a getaddr request during the lifetime of a
  connection since PR #7856.

- Connections to peers who have recently been the first one to give us a valid
  new block or transaction are protected from disconnections since PR #8084.


Low-level RPC changes
----------------------

- RPC calls have been added to output detailed statistics for individual mempool
  entries, as well as to calculate the in-mempool ancestors or descendants of a
  transaction: see `getmempoolentry`, `getmempoolancestors`, `getmempooldescendants`.

- `gettxoutsetinfo` UTXO hash (`hash_serialized`) has changed. There was a divergence between
  32-bit and 64-bit platforms, and the txids were missing in the hashed data. This has been
  fixed, but this means that the output will be different than from previous versions.

- Full UTF-8 support in the RPC API. Non-ASCII characters in, for example,
  wallet labels have always been malformed because they weren't taken into account
  properly in JSON RPC processing. This is no longer the case. This also affects
  the GUI debug console.

- Asm script outputs replacements for OP_NOP2 and OP_NOP3

  - OP_NOP2 has been renamed to OP_CHECKLOCKTIMEVERIFY by [BIP 
65](https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki)

  - OP_NOP3 has been renamed to OP_CHECKSEQUENCEVERIFY by [BIP 
112](https://github.com/bitcoin/bips/blob/master/bip-0112.mediawiki)

  - The following outputs are affected by this change:

    - RPC `getrawtransaction` (in verbose mode)
    - RPC `decoderawtransaction`
    - RPC `decodescript`
    - REST `/rest/tx/` (JSON format)
    - REST `/rest/block/` (JSON format when including extended tx details)
    - `bitcoin-tx -json`

- The sorting of the output of the `getrawmempool` output has changed.

- New RPC commands: `generatetoaddress`, `importprunedfunds`, `removeprunedfunds`, `signmessagewithprivkey`,
  `getmempoolancestors`, `getmempooldescendants`, `getmempoolentry`,
  `createwitnessaddress`, `addwitnessaddress`.

- Removed RPC commands: `setgenerate`, `getgenerate`.

- New options were added to `fundrawtransaction`: `includeWatching`, `changeAddress`, `changePosition` and `feeRate`.


Low-level ZMQ changes
----------------------

- Each ZMQ notification now contains an up-counting sequence number that allows
  listeners to detect lost notifications.
  The sequence number is always the last element in a multi-part ZMQ notification and
  therefore backward compatible. Each message type has its own counter.
  PR [#7762](https://github.com/bitcoin/bitcoin/pull/7762).


0.13.0 Change log
=================

Detailed release notes follow. This overview includes changes that affect
behavior, not code moves, refactors and string updates. For convenience in locating
the code changes and accompanying discussion, both the pull request and
git merge commit are mentioned.

### RPC and other APIs

- #7156 `9ee02cf` Remove cs_main lock from `createrawtransaction` (laanwj)
- #7326 `2cd004b` Fix typo, wrong information in gettxout help text (paveljanik)
- #7222 `82429d0` Indicate which transactions are signaling opt-in RBF (sdaftuar)
- #7480 `b49a623` Changed getnetworkhps value to double to avoid overflow (instagibbs)
- #7550 `8b958ab` Input-from-stdin mode for bitcoin-cli (laanwj)
- #7670 `c9a1265` Use cached block hash in blockToJSON() (rat4)
- #7726 `9af69fa` Correct importaddress help reference to importpubkey (CypherGrue)
- #7766 `16555b6` Register calls where they are defined (laanwj)
- #7797 `e662a76` Fix generatetoaddress failing to parse address (mruddy)
- #7774 `916b15a` Add versionHex in getblock and getblockheader JSON results (mruddy)
- #7863 `72c54e3` Getblockchaininfo: make bip9_softforks an object, not an array (rustyrussell)
- #7842 `d97101e` Do not print minping time in getpeerinfo when no ping received yet (paveljanik)
- #7518 `be14ca5` Add multiple options to fundrawtransaction (promag)
- #7756 `9e47fce` Add cursor to iterate over utxo set, use this in `gettxoutsetinfo` (laanwj)
- #7848 `88616d2` Divergence between 32- and 64-bit when hashing >4GB affects `gettxoutsetinfo` (laanwj)
- #7827 `4205ad7` Speed up `getchaintips` (mrbandrews)
- #7762 `a1eb344` Append a message sequence number to every ZMQ notification (jonasschnelli)
- #7688 `46880ed` List solvability in listunspent output and improve help (sipa)
- #7926 `5725807` Push back `getaddednodeinfo` dead value (instagibbs)
- #7953 `0630353` Create `signmessagewithprivkey` rpc (achow101)
- #8049 `c028c7b` Expose information on whether transaction relay is enabled in `getnetworkinfo` (laanwj)
- #7967 `8c1e49b` Add feerate option to `fundrawtransaction` (jonasschnelli)
- #8118 `9b6a48c` Reduce unnecessary hashing in `signrawtransaction` (jonasnick)
- #7957 `79004d4` Add support for transaction sequence number (jonasschnelli)
- #8153 `75ec320` `fundrawtransaction` feeRate: Use BTC/kB (MarcoFalke)
- #7292 `7ce9ac5` Expose ancestor/descendant information over RPC (sdaftuar)
- #8171 `62fcf27` Fix createrawtx sequence number unsigned int parsing (jonasschnelli)
- #7892 `9c3d0fa` Add full UTF-8 support to RPC (laanwj)
- #8317 `304eff3` Don't use floating point in rpcwallet (MarcoFalke)
- #8258 `5a06ebb` Hide softfork in `getblockchaininfo` if timeout is 0 (jl2012)
- #8244 `1922e5a` Remove unnecessary LOCK(cs_main) in getrawmempool (dcousens)

### Block and transaction handling

- #7056 `6a07208` Save last db read (morcos)
- #6842 `0192806` Limitfreerelay edge case bugfix (ptschip)
- #7084 `11d74f6` Replace maxFeeRate of 10000*minRelayTxFee with maxTxFee in mempool (MarcoFalke)
- #7539 `9f33dba` Add tags to mempool's mapTx indices (sdaftuar)
- #7592 `26a2a72` Re-remove ERROR logging for mempool rejects (laanwj)
- #7187 `14d6324` Keep reorgs fast for SequenceLocks checks (morcos)
- #7594 `01f4267` Mempool: Add tracking of ancestor packages (sdaftuar)
- #7904 `fc9e334` Txdb: Fix assert crash in new UTXO set cursor (laanwj)
- #7927 `f9c2ac7` Minor changes to dbwrapper to simplify support for other databases (laanwj)
- #7933 `e26b620` Fix OOM when deserializing UTXO entries with invalid length (sipa)
- #8020 `5e374f7` Use SipHash-2-4 for various non-cryptographic hashes (sipa)
- #8076 `d720980` VerifyDB: don't check blocks that have been pruned (sdaftuar)
- #8080 `862fd24` Do not use mempool for GETDATA for tx accepted after the last mempool req (gmaxwell)
- #7997 `a82f033` Replace mapNextTx with slimmer setSpends (kazcw)
- #8220 `1f86d64` Stop trimming when mapTx is empty (sipa)
- #8273 `396f9d6` Bump `-dbcache` default to 300MiB (laanwj)
- #7225 `eb33179` Eliminate unnecessary call to CheckBlock (sdaftuar)
- #7907 `006cdf6` Optimize and Cleanup CScript::FindAndDelete (pstratem)
- #7917 `239d419` Optimize reindex (sipa)
- #7763 `3081fb9` Put hex-encoded version in UpdateTip (sipa)
- #8149 `d612837` Testnet-only segregated witness (sipa)
- #8305 `3730393` Improve handling of unconnecting headers (sdaftuar)
- #8363 `fca1a41` Rename "block cost" to "block weight" (sdaftuar)
- #8381 `f84ee3d` Make witness v0 outputs non-standard (jl2012)
- #8364 `3f65ba2` Treat high-sigop transactions as larger rather than rejecting them (sipa)

### P2P protocol and network code

- #6589 `dc0305d` Log bytes recv/sent per command (jonasschnelli)
- #7164 `3b43cad` Do not download transactions during initial blockchain sync (ptschip)
- #7458 `898fedf` peers.dat, banlist.dat recreated when missing (kirkalx)
- #7637 `3da5d1b` Fix memleak in TorController (laanwj, jonasschnelli)
- #7553 `9f14e5a` Remove vfReachable and modify IsReachable to only use vfLimited (pstratem)
- #7708 `9426632` De-neuter NODE_BLOOM (pstratem)
- #7692 `29b2be6` Remove P2P alert system (btcdrak)
- #7542 `c946a15` Implement "feefilter" P2P message (morcos)
- #7573 `352fd57` Add `-maxtimeadjustment` command line option (mruddy)
- #7570 `232592a` Add IPv6 Link-Local Address Support (mruddy)
- #7874 `e6a4d48` Improve AlreadyHave (morcos)
- #7856 `64e71b3` Only send one GetAddr response per connection (gmaxwell)
- #7868 `7daa3ad` Split DNS resolving functionality out of net structures (theuni)
- #7919 `7617682` Fix headers announcements edge case (sdaftuar)
- #7514 `d9594bf` Fix IsInitialBlockDownload for testnet (jmacwhyte)
- #7959 `03cf6e8` fix race that could fail to persist a ban (kazcw)
- #7840 `3b9a0bf` Several performance and privacy improvements to inv/mempool handling (sipa)
- #8011 `65aecda` Don't run ThreadMessageHandler at lowered priority (kazcw)
- #7696 `5c3f8dd` Fix de-serialization bug where AddrMan is left corrupted (EthanHeilman)
- #7932 `ed749bd` CAddrMan::Deserialize handle corrupt serializations better (pstratem)
- #7906 `83121cc` Prerequisites for p2p encapsulation changes (theuni)
- #8033 `18436d8` Fix Socks5() connect failures to be less noisy and less unnecessarily scary (wtogami)
- #8082 `01d8359` Defer inserting into maprelay until just before relaying (gmaxwell)
- #7960 `6a22373` Only use AddInventoryKnown for transactions (sdaftuar)
- #8078 `2156fa2` Disable the mempool P2P command when bloom filters disabled (petertodd)
- #8065 `67c91f8` Addrman offline attempts (gmaxwell)
- #7703 `761cddb` Tor: Change auth order to only use password auth if -torpassword (laanwj)
- #8083 `cd0c513` Add support for dnsseeds with option to filter by servicebits (jonasschnelli)
- #8173 `4286f43` Use SipHash for node eviction (sipa)
- #8154 `1445835` Drop vAddrToSend after sending big addr message (kazcw)
- #7749 `be9711e` Enforce expected outbound services (sipa)
- #8208 `0a64777` Do not set extra flags for unfiltered DNS seed results (sipa)
- #8084 `e4bb4a8` Add recently accepted blocks and txn to AttemptToEvictConnection (gmaxwell)
- #8113 `3f89a53` Rework addnode behaviour (sipa)
- #8179 `94ab58b` Evict orphans which are included or precluded by accepted blocks (gmaxwell)
- #8068 `e9d76a1` Compact Blocks (TheBlueMatt)
- #8204 `0833894` Update petertodd's testnet seed (petertodd)
- #8247 `5cd35d3` Mark my dnsseed as supporting filtering (sipa)
- #8275 `042c323` Remove bad chain alert partition check (btcdrak)
- #8271 `1bc9c80` Do not send witnesses in cmpctblock (sipa)
- #8312 `ca40ef6` Fix mempool DoS vulnerability from malleated transactions (sdaftuar)
- #7180 `16ccb74` Account for `sendheaders` `verack` messages (laanwj)
- #8102 `425278d` Bugfix: use global ::fRelayTxes instead of CNode in version send (sipa)
- #8408 `b7e2011` Prevent fingerprinting, disk-DoS with compact blocks (sdaftuar)

### Build system

- #7302 `41f1a3e` C++11 build/runtime fixes (theuni)
- #7322 `fd9356b` c++11: add scoped enum fallbacks to CPPFLAGS rather than defining them locally (theuni)
- #7441 `a6771fc` Use Debian 8.3 in gitian build guide (fanquake)
- #7349 `152a821` Build against system UniValue when available (luke-jr)
- #7520 `621940e` LibreSSL doesn't define OPENSSL_VERSION, use LIBRESSL_VERSION_TEXT instead (paveljanik)
- #7528 `9b9bfce` autogen.sh: warn about needing autoconf if autoreconf is not found (knocte)
- #7504 `19324cf` Crystal clean make clean (paveljanik)
- #7619 `18b3f1b` Add missing sudo entry in gitian VM setup (btcdrak)
- #7616 `639ec58`  [depends] Delete unused patches  (MarcoFalke)
- #7658 `c15eb28` Add curl to Gitian setup instructions (btcdrak)
- #7710 `909b72b` [Depends] Bump miniupnpc and config.guess+sub (fanquake)
- #7723 `5131005` build: python 3 compatibility (laanwj)
- #7477 `28ad4d9` Fix quoting of copyright holders in configure.ac (domob1812)
- #7711 `a67bc5e` [build-aux] Update Boost & check macros to latest serials (fanquake)
- #7788 `4dc1b3a` Use relative paths instead of absolute paths in protoc calls (paveljanik)
- #7809 `bbd210d` depends: some base fixes/changes (theuni)
- #7603 `73fc922` Build System: Use PACKAGE_TARNAME in NSIS script (JeremyRand)
- #7905 `187186b` test: move accounting_tests and rpc_wallet_tests to wallet/test (laanwj)
- #7911 `351abf9` leveldb: integrate leveldb into our buildsystem (theuni)
- #7944 `a407807` Re-instate TARGET_OS=linux in configure.ac. Removed by 351abf9e035 (randy-waterhouse)
- #7920 `c3e3cfb` Switch Travis to Trusty (theuni)
- #7954 `08b37c5` build: quiet annoying warnings without adding new ones (theuni)
- #7165 `06162f1` build: Enable C++11 in build, require C++11 compiler (laanwj)
- #7982 `559fbae` build: No need to check for leveldb atomics (theuni)
- #8002 `f9b4582` [depends] Add -stdlib=libc++ to darwin CXX flags (fanquake)
- #7993 `6a034ed` [depends] Bump Freetype, ccache, ZeroMQ, miniupnpc, expat (fanquake)
- #8167 `19ea173` Ship debug tarballs/zips with debug symbols (theuni)
- #8175 `f0299d8` Add --disable-bench to config flags for windows (laanwj)
- #7283 `fd9881a` [gitian] Default reference_datetime to commit author date (MarcoFalke)
- #8181 `9201ce8` Get rid of `CLIENT_DATE` (laanwj)
- #8133 `fde0ac4` Finish up out-of-tree changes (theuni)
- #8188 `65a9d7d` Add armhf/aarch64 gitian builds (theuni)
- #8194 `cca1c8c` [gitian] set correct PATH for wrappers (MarcoFalke)
- #8198 `5201614` Sync ax_pthread with upstream draft4 (fanquake)
- #8210 `12a541e` [Qt] Bump to Qt5.6.1 (jonasschnelli)
- #8285 `da50997` windows: Add testnet link to installer (laanwj)
- #8304 `0cca2fe` [travis] Update SDK_URL (MarcoFalke)
- #8310 `6ae20df` Require boost for bench (theuni)
- #8315 `2e51590` Don't require sudo for Linux (theuni)
- #8314 `67caef6` Fix pkg-config issues for 0.13 (theuni)
- #8373 `1fe7f40` Fix OSX non-deterministic dmg (theuni)
- #8358 `cfd1280` Gbuild: Set memory explicitly (default is too low) (MarcoFalke)

### GUI

- #7154 `00b4b8d` Add InMempool() info to transaction details (jonasschnelli)
- #7068 `5f3c670` [RPC-Tests] add simple way to run rpc test over QT clients (jonasschnelli)
- #7218 `a1c185b` Fix misleading translation (MarcoFalke)
- #7214 `be9a9a3` qt5: Use the fixed font the system recommends (MarcoFalke)
- #7256 `08ab906` Add note to coin control dialog QT5 workaround (fanquake)
- #7255 `e289807` Replace some instances of formatWithUnit with formatHtmlWithUnit (fanquake)
- #7317 `3b57e9c` Fix RPCTimerInterface ordering issue (jonasschnelli)
- #7327 `c079d79` Transaction View: LastMonth calculation fixed (crowning-)
- #7334 `e1060c5` coincontrol workaround is still needed in qt5.4 (fixed in qt5.5) (MarcoFalke)
- #7383 `ae2db67` Rename "amount" to "requested amount" in receive coins table (jonasschnelli)
- #7396 `cdcbc59` Add option to increase/decrease font size in the console window (jonasschnelli)
- #7437 `9645218` Disable tab navigation for peers tables (Kefkius)
- #7604 `354b03d` build: Remove spurious dollar sign. Fixes #7189 (dooglus)
- #7605 `7f001bd` Remove openssl info from init/log and from Qt debug window (jonasschnelli)
- #7628 `87d6562` Add 'copy full transaction details' option (ericshawlinux)
- #7613 `3798e5d` Add autocomplete to bitcoin-qt's console window (GamerSg)
- #7668 `b24266c` Fix history deletion bug after font size change (achow101)
- #7680 `41d2dfa` Remove reflection from `about` icon (laanwj)
- #7686 `f034bce` Remove 0-fee from send dialog (MarcoFalke)
- #7506 `b88e0b0` Use CCoinControl selection in CWallet::FundTransaction (promag)
- #7732 `0b98dd7` Debug window: replace "Build date" with "Datadir" (jonasschnelli)
- #7761 `60db51d` remove trailing output-index from transaction-id (jonasschnelli)
- #7772 `6383268` Clear the input line after activating autocomplete (paveljanik)
- #7925 `f604bf6` Fix out-of-tree GUI builds (laanwj)
- #7939 `574ddc6` Make it possible to show details for multiple transactions (laanwj)
- #8012 `b33824b` Delay user confirmation of send (Tyler-Hardin)
- #8006 `7c8558d` Add option to disable the system tray icon (Tyler-Hardin)
- #8046 `169d379` Fix Cmd-Q / Menu Quit shutdown on OSX (jonasschnelli)
- #8042 `6929711` Don't allow to open the debug window during splashscreen & verification state (jonasschnelli)
- #8014 `77b49ac` Sort transactions by date (Tyler-Hardin)
- #8073 `eb2f6f7` askpassphrasedialog: Clear pass fields on accept (rat4)
- #8129 `ee1533e` Fix RPC console auto completer (UdjinM6)
- #7636 `fb0ac48` Add bitcoin address label to request payment QR code (makevoid)
- #8231 `760a6c7` Fix a bug where the SplashScreen will not be hidden during startup (jonasschnelli)
- #8256 `af2421c` BUG: bitcoin-qt crash (fsb4000)
- #8257 `ff03c50` Do not ask a UI question from bitcoind (sipa)
- #8288 `91abb77` Network-specific example address (laanwj)
- #7707 `a914968` UI support for abandoned transactions (jonasschnelli)
- #8207 `f7a403b` Add a link to the Bitcoin-Core repository and website to the About Dialog (MarcoFalke)
- #8281 `6a87eb0` Remove client name from debug window (laanwj)
- #8407 `45eba4b` Add dbcache migration path (jonasschnelli)

### Wallet

- #7262 `fc08994` Reduce inefficiency of GetAccountAddress() (dooglus)
- #7537 `78e81b0` Warn on unexpected EOF while salvaging wallet (laanwj)
- #7521 `3368895` Don't resend wallet txs that aren't in our own mempool (morcos)
- #7576 `86a1ec5` Move wallet help string creation to CWallet (jonasschnelli)
- #7577 `5b3b5a7` Move "load wallet phase" to CWallet (jonasschnelli)
- #7608 `0735c0c` Move hardcoded file name out of log messages (MarcoFalke)
- #7649 `4900641` Prevent multiple calls to CWallet::AvailableCoins (promag)
- #7646 `e5c3511` Fix lockunspent help message (promag)
- #7558 `b35a591` Add import/removeprunedfunds rpc call (instagibbs)
- #6215 `48c5adf` add bip32 pub key serialization (jonasschnelli)
- #7913 `bafd075` Fix for incorrect locking in GetPubKey() (keystore.cpp) (yurizhykin)
- #8036 `41138f9` init: Move berkeleydb version reporting to wallet (laanwj)
- #8028 `373b50d` Fix insanity of CWalletDB::WriteTx and CWalletTx::WriteToDisk (pstratem)
- #8061 `f6b7df3` Improve Wallet encapsulation (pstratem)
- #7891 `950be19` Always require OS randomness when generating secret keys (sipa)
- #7689 `b89ef13` Replace OpenSSL AES with ctaes-based version (sipa)
- #7825 `f972b04` Prevent multiple calls to ExtractDestination (pedrobranco)
- #8137 `243ac0c` Improve CWallet API with new AccountMove function (pstratem)
- #8142 `52c3f34` Improve CWallet API  with new GetAccountPubkey function (pstratem)
- #8035 `b67a472` Add simplest BIP32/deterministic key generation implementation (jonasschnelli)
- #7687 `a6ddb19` Stop treating importaddress'ed scripts as change (sipa)
- #8298 `aef3811` wallet: Revert input selection post-pruning (laanwj)
- #8324 `bc94b87` Keep HD seed during salvagewallet (jonasschnelli)
- #8323 `238300b` Add HD keypath to CKeyMetadata, report metadata in validateaddress (jonasschnelli)
- #8367 `3b38a6a` Ensure <0.13 clients can't open HD wallets (jonasschnelli)
- #8378 `ebea651` Move SetMinVersion for FEATURE_HD to SetHDMasterKey (pstratem)
- #8390 `73adfe3` Correct hdmasterkeyid/masterkeyid name confusion (jonasschnelli)
- #8206 `18b8ee1` Add HD xpriv to dumpwallet (jonasschnelli)
- #8389 `c3c82c4` Create a new HD seed after encrypting the wallet (jonasschnelli)

### Tests and QA

- #7320 `d3dfc6d` Test walletpassphrase timeout (MarcoFalke)
- #7208 `47c5ed1` Make max tip age an option instead of chainparam (laanwj)
- #7372 `21376af` Trivial: [qa] wallet: Print maintenance (MarcoFalke)
- #7280 `668906f` [travis] Fail when documentation is outdated (MarcoFalke)
- #7177 `93b0576` [qa] Change default block priority size to 0 (MarcoFalke)
- #7236 `02676c5` Use createrawtx locktime parm in txn_clone (dgenr8)
- #7212 `326ffed` Adds unittests for CAddrMan and CAddrinfo, removes source of non-determinism (EthanHeilman)
- #7490 `d007511` tests: Remove May15 test (laanwj)
- #7531 `18cb2d5` Add bip68-sequence.py to extended rpc tests (btcdrak)
- #7536 `ce5fc02` test: test leading spaces for ParseHex (laanwj)
- #7620 `1b68de3` [travis] Only run check-doc.py once (MarcoFalke)
- #7455 `7f96671` [travis] Exit early when check-doc.py fails (MarcoFalke)
- #7667 `56d2c4e` Move GetTempPath() to testutil (musalbas)
- #7517 `f1ca891` test: script_error checking in script_invalid tests (laanwj)
- #7684 `3d0dfdb` Extend tests (MarcoFalke)
- #7697 `622fe6c` Tests: make prioritise_transaction.py more robust (sdaftuar)
- #7709 `efde86b` Tests: fix missing import in mempool_packages (sdaftuar)
- #7702 `29e1131` Add tests verifychain, lockunspent, getbalance, listsinceblock (MarcoFalke)
- #7720 `3b4324b` rpc-test: Normalize assert() (MarcoFalke)
- #7757 `26794d4` wallet: Wait for reindex to catch up (MarcoFalke)
- #7764 `a65b36c` Don't run pruning.py twice (MarcoFalke)
- #7773 `7c80e72` Fix comments in tests (btcdrak)
- #7489 `e9723cb` tests: Make proxy_test work on travis servers without IPv6 (laanwj)
- #7801 `70ac71b` Remove misleading "errorString syntax" (MarcoFalke)
- #7803 `401c65c` maxblocksinflight: Actually enable test (MarcoFalke)
- #7802 `3bc71e1` httpbasics: Actually test second connection (MarcoFalke)
- #7849 `ab8586e` tests: add varints_bitpatterns test (laanwj)
- #7846 `491171f` Clean up lockorder data of destroyed mutexes (sipa)
- #7853 `6ef5e00` py2: Unfiddle strings into bytes explicitly (MarcoFalke)
- #7878 `53adc83` [test] bctest.py: Revert faa41ee (MarcoFalke)
- #7798 `cabba24` [travis] Print the commit which was evaluated (MarcoFalke)
- #7833 `b1bf511` tests: Check Content-Type header returned from RPC server (laanwj)
- #7851 `fa9d86f` pull-tester: Don't mute zmq ImportError (MarcoFalke)
- #7822 `0e6fd5e` Add listunspent() test for spendable/unspendable UTXO (jpdffonseca)
- #7912 `59ad568` Tests: Fix deserialization of reject messages (sdaftuar)
- #7941 `0ea3941` Fixing comment in script_test.json test case (Christewart)
- #7807 `0ad1041` Fixed miner test values, gave constants for less error-prone values (instagibbs)
- #7980 `88b77c7` Smartfees: Properly use ordered dict (MarcoFalke)
- #7814 `77b637f` Switch to py3 (MarcoFalke)
- #8030 `409a8a1` Revert fatal-ness of missing python-zmq (laanwj)
- #8018 `3e90fe6` Autofind rpc tests --srcdir (jonasschnelli)
- #8016 `5767e80` Fix multithread CScheduler and reenable test (paveljanik)
- #7972 `423ca30` pull-tester: Run rpc test in parallel  (MarcoFalke)
- #8039 `69b3a6d` Bench: Add crypto hash benchmarks (laanwj)
- #8041 `5b736dd` Fix bip9-softforks blockstore issue (MarcoFalke)
- #7994 `1f01443` Add op csv tests to script_tests.json (Christewart)
- #8038 `e2bf830` Various minor fixes (MarcoFalke)
- #8072 `1b87e5b` Travis: 'make check' in parallel and verbose (theuni)
- #8056 `8844ef1` Remove hardcoded "4 nodes" from test_framework (MarcoFalke)
- #8047 `37f9a1f` Test_framework: Set wait-timeout for bitcoind procs (MarcoFalke)
- #8095 `6700cc9` Test framework: only cleanup on successful test runs (sdaftuar)
- #8098 `06bd4f6` Test_framework: Append portseed to tmpdir (MarcoFalke)
- #8104 `6ff2c8d` Add timeout to sync_blocks() and sync_mempools() (sdaftuar)
- #8111 `61b8684` Benchmark SipHash (sipa)
- #8107 `52b803e` Bench: Added base58 encoding/decoding benchmarks (yurizhykin)
- #8115 `0026e0e` Avoid integer division in the benchmark inner-most loop (gmaxwell)
- #8090 `a2df115` Adding P2SH(p2pkh) script test case (Christewart)
- #7992 `ec45cc5` Extend #7956 with one more test (TheBlueMatt)
- #8139 `ae5575b` Fix interrupted HTTP RPC connection workaround for Python 3.5+ (sipa)
- #8164 `0f24eaf` [Bitcoin-Tx] fix missing test fixtures, fix 32bit atoi issue (jonasschnelli)
- #8166 `0b5279f` Src/test: Do not shadow local variables (paveljanik)
- #8141 `44c1b1c` Continuing port of java comparison tool (mrbandrews)
- #8201 `36b7400` fundrawtransaction: Fix race, assert amounts (MarcoFalke)
- #8214 `ed2cd59` Mininode: fail on send_message instead of silent return (MarcoFalke)
- #8215 `a072d1a` Don't use floating point in wallet tests (MarcoFalke)
- #8066 `65c2058` Test_framework: Use different rpc_auth_pair for each node (MarcoFalke)
- #8216 `0d41d70` Assert 'changePosition out of bounds'  (MarcoFalke)
- #8222 `961893f` Enable mempool consistency checks in unit tests (sipa)
- #7751 `84370d5` test_framework: python3.4 authproxy compat (laanwj)
- #7744 `d8e862a` test_framework: detect failure of bitcoind startup (laanwj)
- #8280 `115735d` Increase sync_blocks() timeouts in pruning.py (MarcoFalke)
- #8340 `af9b7a9` Solve trivial merge conflict in p2p-segwit.py (MarcoFalke)
- #8067 `3e4cf8f` Travis: use slim generic image, and some fixups (theuni)
- #7951 `5c7df70` Test_framework: Properly print exception (MarcoFalke)
- #8070 `7771aa5` Remove non-determinism which is breaking net_tests #8069 (EthanHeilman)
- #8309 `bb2646a` Add wallet-hd test (MarcoFalke)
- #8444 `cd0910b` Fix p2p-feefilter.py for changed tx relay behavior (sdaftuar)

### Mining

- #7507 `11c7699` Remove internal miner (Leviathn)
- #7663 `c87f51e` Make the generate RPC call function for non-regtest (sipa)
- #7671 `e2ebd25` Add generatetoaddress RPC to mine to an address (achow101)
- #7935 `66ed450` Versionbits: GBT support (luke-jr)
- #7600 `66db2d6` Select transactions using feerate-with-ancestors (sdaftuar)
- #8295 `f5660d3` Mining-related fixups for 0.13.0 (sdaftuar)
- #7796 `536b75e` Add support for negative fee rates, fixes `prioritizetransaction` (MarcoFalke)
- #8362 `86edc20` Scale legacy sigop count in CreateNewBlock (sdaftuar)
- #8489 `8b0eee6` Bugfix: Use pre-BIP141 sigops until segwit activates (GBT) (luke-jr)

### Documentation and miscellaneous

- #7423 `69e2a40` Add example for building with constrained resources (jarret)
- #8254 `c2c69ed` Add OSX ZMQ requirement to QA readme (fanquake)
- #8203 `377d131` Clarify documentation for running a tor node (nathaniel-mahieu)
- #7428 `4b12266` Add example for listing ./configure flags (nathaniel-mahieu)
- #7847 `3eae681` Add arch linux build example (mruddy)
- #7968 `ff69aaf` Fedora build requirements (wtogami)
- #8013 `fbedc09` Fedora build requirements, add gcc-c++ and fix typo (wtogami)
- #8009 `fbd8478` Fixed invalid example paths in gitian-building.md (JeremyRand)
- #8240 `63fbdbc` Mention Windows XP end of support in release notes (laanwj)
- #8303 `5077d2c` Update bips.md for CSV softfork (fanquake)
- #7789 `e0b3e19` Add note about using the Qt official binary installer (paveljanik)
- #7791 `e30a5b0` Change Precise to Trusty in gitian-building.md (JeremyRand)
- #7838 `8bb5d3d` Update gitian build guide to debian 8.4.0 (fanquake)
- #7855 `b778e59` Replace precise with trusty (MarcoFalke)
- #7975 `fc23fee` Update bitcoin-core GitHub links (MarcoFalke)
- #8034 `e3a8207` Add basic git squash workflow (fanquake)
- #7813 `214ec0b` Update port in tor.md (MarcoFalke)
- #8193 `37c9830` Use Debian 8.5 in the gitian-build guide (fanquake)
- #8261 `3685e0c` Clarify help for `getblockchaininfo` (paveljanik)
- #7185 `ea0f5a2` Note that reviewers should mention the id of the commits they reviewed (pstratem)
- #7290 `c851d8d` [init] Add missing help for args (MarcoFalke)
- #7281 `f9fd4c2` Improve CheckInputs() comment about sig verification (petertodd)
- #7417 `1e06bab` Minor improvements to the release process (PRabahy)
- #7444 `4cdbd42` Improve block validity/ConnectBlock() comments (petertodd)
- #7527 `db2e1c0` Fix and cleanup listreceivedbyX documentation (instagibbs)
- #7541 `b6e00af` Clarify description of blockindex (pinheadmz)
- #7590 `f06af57` Improving wording related to Boost library requirements [updated] (jonathancross)
- #7635 `0fa88ef` Add dependency info to test docs (elliotolds)
- #7609 `3ba07bd` RPM spec file project (AliceWonderMiscreations)
- #7850 `229a17c` Removed call to `TryCreateDirectory` from `GetDefaultDataDir` in `src/util.cpp` (alexreg)
- #7888 `ec870e1` Prevector: fix 2 bugs in currently unreached code paths (kazcw)
- #7922 `90653bc` CBase58Data::SetString: cleanse the full vector (kazcw)
- #7881 `c4e8390` Update release process (laanwj)
- #7952 `a9c8b74` Log invalid block hash to make debugging easier (paveljanik)
- #7974 `8206835` More comments on the design of AttemptToEvictConnection (gmaxwell)
- #7795 `47a7cfb` UpdateTip: log only one line at most per block (laanwj)
- #8110 `e7e25ea` Add benchmarking notes (fanquake)
- #8121 `58f0c92` Update implemented BIPs list (fanquake)
- #8029 `58725ba` Simplify OS X build notes (fanquake)
- #8143 `d46b8b5` comment nit: miners don't vote (instagibbs)
- #8136 `22e0b35` Log/report in 10% steps during VerifyDB (jonasschnelli)
- #8168 `d366185` util: Add ParseUInt32 and ParseUInt64 (laanwj)
- #8178 `f7b1bfc` Add git and github tips and tricks to developer notes (sipa)
- #8177 `67db011` developer notes: updates for C++11 (kazcw)
- #8229 `8ccdac1` [Doc] Update OS X build notes for 10.11 SDK (fanquake)
- #8233 `9f1807a` Mention Linux ARM executables in release process and notes (laanwj)
- #7540 `ff46dd4` Rename OP_NOP3 to OP_CHECKSEQUENCEVERIFY (btcdrak)
- #8289 `26316ff` bash-completion: Adapt for 0.12 and 0.13 (roques)
- #7453 `3dc3149` Missing patches from 0.12 (MarcoFalke)
- #7113 `54a550b` Switch to a more efficient rolling Bloom filter (sipa)
- #7257 `de9e5ea` Combine common error strings for different options so translations can be shared and reused (luke-jr)
- #7304 `b8f485c` [contrib] Add clang-format-diff.py (MarcoFalke)
- #7378 `e6f97ef` devtools: replace github-merge with python version (laanwj)
- #7395 `0893705` devtools: show pull and commit information in github-merge (laanwj)
- #7402 `6a5932b` devtools: github-merge get toplevel dir without extra whitespace (achow101)
- #7425 `20a408c` devtools: Fix utf-8 support in messages for github-merge (laanwj)
- #7632 `409f843` Delete outdated test-patches reference (Lewuathe)
- #7662 `386f438` remove unused NOBLKS_VERSION_{START,END} constants (rat4)
- #7737 `aa0d2b2` devtools: make github-merge.py use py3 (laanwj)
- #7781 `55db5f0` devtools: Auto-set branch to merge to in github-merge (laanwj)
- #7934 `f17032f` Improve rolling bloom filter performance and benchmark (sipa)
- #8004 `2efe38b` signal handling: fReopenDebugLog and fRequestShutdown should be type sig_atomic_t (catilac)
- #7713 `f6598df` Fixes for verify-commits script (petertodd)
- #8412 `8360d5b` libconsensus: Expose a flag for BIP112 (jtimon)

Credits
=======

Thanks to everyone who directly contributed to this release:

- 21E14
- accraze
- Adam Brown
- Alexander Regueiro
- Alex Morcos
- Alfie John
- Alice Wonder
- AlSzacrel
- Andrew Chow
- Andrés G. Aragoneses
- Bob McElrath
- BtcDrak
- calebogden
- Cédric Félizard
- Chirag Davé
- Chris Moore
- Chris Stewart
- Christian von Roques
- Chris Wheeler
- Cory Fields
- crowning-
- Daniel Cousens
- Daniel Kraft
- Denis Lukianov
- Elias Rohrer
- Elliot Olds
- Eric Shaw
- error10
- Ethan Heilman
- face
- fanquake
- Francesco 'makevoid' Canessa
- fsb4000
- Gavin Andresen
- gladoscc
- Gregory Maxwell
- Gregory Sanders
- instagibbs
- James O'Beirne
- Jannes Faber
- Jarret Dyrbye
- Jeremy Rand
- jloughry
- jmacwhyte
- Joao Fonseca
- Johnson Lau
- Jonas Nick
- Jonas Schnelli
- Jonathan Cross
- João Barbosa
- Jorge Timón
- Kaz Wesley
- Kefkius
- kirkalx
- Krzysztof Jurewicz
- Leviathn
- lewuathe
- Luke Dashjr
- Luv Khemani
- Marcel Krüger
- Marco Falke
- Mark Friedenbach
- Matt
- Matt Bogosian
- Matt Corallo
- Matthew English
- Matthew Zipkin
- mb300sd
- Mitchell Cash
- mrbandrews
- mruddy
- Murch
- Mustafa
- Nathaniel Mahieu
- Nicolas Dorier
- Patrick Strateman
- Paul Rabahy
- paveljanik
- Pavel Janík
- Pavel Vasin
- Pedro Branco
- Peter Todd
- Philip Kaufmann
- Pieter Wuille
- Prayag Verma
- ptschip
- Puru
- randy-waterhouse
- R E Broadley
- Rusty Russell
- Suhas Daftuar
- Suriyaa Kudo
- TheLazieR Yip
- Thomas Kerin
- Tom Harding
- Tyler Hardin
- UdjinM6
- Warren Togami
- Will Binns
- Wladimir J. van der Laan
- Yuri Zhykin

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).
Bitcoin Core version 0.12.1 is now available from:

  <https://bitcoin.org/bin/bitcoin-core-0.12.1/>

This is a new minor version release, including the BIP9, BIP68 and BIP112
softfork, various bugfixes and updated translations.

Please report bugs using the issue tracker at github:

  <https://github.com/bitcoin/bitcoin/issues>

Upgrading and downgrading
=========================

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

Downgrade warning
-----------------

### Downgrade to a version < 0.12.0

Because release 0.12.0 and later will obfuscate the chainstate on every
fresh sync or reindex, the chainstate is not backwards-compatible with
pre-0.12 versions of Bitcoin Core or other software.

If you want to downgrade after you have done a reindex with 0.12.0 or later,
you will need to reindex when you first start Bitcoin Core version 0.11 or
earlier.

Notable changes
===============

First version bits BIP9 softfork deployment
-------------------------------------------

This release includes a soft fork deployment to enforce [BIP68][],
[BIP112][] and [BIP113][] using the [BIP9][] deployment mechanism.

The deployment sets the block version number to 0x20000001 between
midnight 1st May 2016 and midnight 1st May 2017 to signal readiness for 
deployment. The version number consists of 0x20000000 to indicate version
bits together with setting bit 0 to indicate support for this combined
deployment, shown as "csv" in the `getblockchaininfo` RPC call.

For more information about the soft forking change, please see
<https://github.com/bitcoin/bitcoin/pull/7648>

This specific backport pull-request can be viewed at
<https://github.com/bitcoin/bitcoin/pull/7543>

[BIP9]: https://github.com/bitcoin/bips/blob/master/bip-0009.mediawiki
[BIP68]: https://github.com/bitcoin/bips/blob/master/bip-0068.mediawiki
[BIP112]: https://github.com/bitcoin/bips/blob/master/bip-0112.mediawiki
[BIP113]: https://github.com/bitcoin/bips/blob/master/bip-0113.mediawiki

BIP68 soft fork to enforce sequence locks for relative locktime
---------------------------------------------------------------

[BIP68][] introduces relative lock-time consensus-enforced semantics of
the sequence number field to enable a signed transaction input to remain
invalid for a defined period of time after confirmation of its corresponding
outpoint.

For more information about the implementation, see
<https://github.com/bitcoin/bitcoin/pull/7184>

BIP112 soft fork to enforce OP_CHECKSEQUENCEVERIFY
--------------------------------------------------

[BIP112][] redefines the existing OP_NOP3 as OP_CHECKSEQUENCEVERIFY (CSV)
for a new opcode in the Bitcoin scripting system that in combination with
[BIP68][] allows execution pathways of a script to be restricted based
on the age of the output being spent.

For more information about the implementation, see
<https://github.com/bitcoin/bitcoin/pull/7524>

BIP113 locktime enforcement soft fork
-------------------------------------

Bitcoin Core 0.11.2 previously introduced mempool-only locktime
enforcement using GetMedianTimePast(). This release seeks to
consensus enforce the rule.

Bitcoin transactions currently may specify a locktime indicating when
they may be added to a valid block.  Current consensus rules require
that blocks have a block header time greater than the locktime specified
in any transaction in that block.

Miners get to choose what time they use for their header time, with the
consensus rule being that no node will accept a block whose time is more
than two hours in the future.  This creates a incentive for miners to
set their header times to future values in order to include locktimed
transactions which weren't supposed to be included for up to two more
hours.

The consensus rules also specify that valid blocks may have a header
time greater than that of the median of the 11 previous blocks.  This
GetMedianTimePast() time has a key feature we generally associate with
time: it can't go backwards.

[BIP113][] specifies a soft fork enforced in this release that
weakens this perverse incentive for individual miners to use a future
time by requiring that valid blocks have a computed GetMedianTimePast()
greater than the locktime specified in any transaction in that block.

Mempool inclusion rules currently require transactions to be valid for
immediate inclusion in a block in order to be accepted into the mempool.
This release begins applying the BIP113 rule to received transactions,
so transaction whose time is greater than the GetMedianTimePast() will
no longer be accepted into the mempool.

**Implication for miners:** you will begin rejecting transactions that
would not be valid under BIP113, which will prevent you from producing
invalid blocks when BIP113 is enforced on the network. Any
transactions which are valid under the current rules but not yet valid
under the BIP113 rules will either be mined by other miners or delayed
until they are valid under BIP113. Note, however, that time-based
locktime transactions are more or less unseen on the network currently.

**Implication for users:** GetMedianTimePast() always trails behind the
current time, so a transaction locktime set to the present time will be
rejected by nodes running this release until the median time moves
forward. To compensate, subtract one hour (3,600 seconds) from your
locktimes to allow those transactions to be included in mempools at
approximately the expected time.

For more information about the implementation, see
<https://github.com/bitcoin/bitcoin/pull/6566>

Miscellaneous
-------------

The p2p alert system is off by default. To turn on, use `-alert` with
startup configuration.

0.12.1 Change log
=================

Detailed release notes follow. This overview includes changes that affect
behavior, not code moves, refactors and string updates. For convenience in locating
the code changes and accompanying discussion, both the pull request and
git merge commit are mentioned.

### RPC and other APIs
- #7739 `7ffc2bd` Add abandoned status to listtransactions (jonasschnelli)

### Block and transaction handling
- #7543 `834aaef` Backport BIP9, BIP68 and BIP112 with softfork (btcdrak)

### P2P protocol and network code
- #7804 `90f1d24` Track block download times per individual block (sipa)
- #7832 `4c3a00d` Reduce block timeout to 10 minutes (laanwj)

### Validation
- #7821 `4226aac` init: allow shutdown during 'Activating best chain...' (laanwj)
- #7835 `46898e7` Version 2 transactions remain non-standard until CSV activates (sdaftuar)

### Build system
- #7487 `00d57b4` Workaround Travis-side CI issues (luke-jr)
- #7606 `a10da9a` No need to set -L and --location for curl (MarcoFalke)
- #7614 `ca8f160` Add curl to packages (now needed for depends) (luke-jr)
- #7776 `a784675` Remove unnecessary executables from gitian release (laanwj)

### Wallet
- #7715 `19866c1` Fix calculation of balances and available coins. (morcos)

### Miscellaneous
- #7617 `f04f4fd` Fix markdown syntax and line terminate LogPrint (MarcoFalke)
- #7747 `4d035bc` added depends cross compile info (accraze)
- #7741 `a0cea89` Mark p2p alert system as deprecated (btcdrak)
- #7780 `c5f94f6` Disable bad-chain alert (btcdrak)

Credits
=======

Thanks to everyone who directly contributed to this release:

- accraze
- Alex Morcos
- BtcDrak
- Jonas Schnelli
- Luke Dashjr
- MarcoFalke
- Mark Friedenbach
- NicolasDorier
- Pieter Wuille
- Suhas Daftuar
- Wladimir J. van der Laan

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).

Bitcoin Core version 0.12.0 is now available from:

  <https://bitcoin.org/bin/bitcoin-core-0.12.0/>

This is a new major version release, bringing new features and other improvements.

Please report bugs using the issue tracker at github:

  <https://github.com/bitcoin/bitcoin/issues>

Upgrading and downgrading
=========================

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

Downgrade warning
-----------------

### Downgrade to a version < 0.10.0

Because release 0.10.0 and later makes use of headers-first synchronization and
parallel block download (see further), the block files and databases are not
backwards-compatible with pre-0.10 versions of Bitcoin Core or other software:

* Blocks will be stored on disk out of order (in the order they are
received, really), which makes it incompatible with some tools or
other programs. Reindexing using earlier versions will also not work
anymore as a result of this.

* The block index database will now hold headers for which no block is
stored on disk, which earlier versions won't support.

If you want to be able to downgrade smoothly, make a backup of your entire data
directory. Without this your node will need start syncing (or importing from
bootstrap.dat) anew afterwards. It is possible that the data from a completely
synchronised 0.10 node may be usable in older versions as-is, but this is not
supported and may break as soon as the older version attempts to reindex.

This does not affect wallet forward or backward compatibility.

### Downgrade to a version < 0.12.0

Because release 0.12.0 and later will obfuscate the chainstate on every
fresh sync or reindex, the chainstate is not backwards-compatible with
pre-0.12 versions of Bitcoin Core or other software.

If you want to downgrade after you have done a reindex with 0.12.0 or later,
you will need to reindex when you first start Bitcoin Core version 0.11 or
earlier.

Notable changes
===============

Signature validation using libsecp256k1
---------------------------------------

ECDSA signatures inside Bitcoin transactions now use validation using
[libsecp256k1](https://github.com/bitcoin-core/secp256k1) instead of OpenSSL.

Depending on the platform, this means a significant speedup for raw signature
validation speed. The advantage is largest on x86_64, where validation is over
five times faster. In practice, this translates to a raw reindexing and new
block validation times that are less than half of what it was before.

Libsecp256k1 has undergone very extensive testing and validation.

A side effect of this change is that libconsensus no longer depends on OpenSSL.

Reduce upload traffic
---------------------

A major part of the outbound traffic is caused by serving historic blocks to
other nodes in initial block download state.

It is now possible to reduce the total upload traffic via the `-maxuploadtarget`
parameter. This is *not* a hard limit but a threshold to minimize the outbound
traffic. When the limit is about to be reached, the uploaded data is cut by not
serving historic blocks (blocks older than one week).
Moreover, any SPV peer is disconnected when they request a filtered block.

This option can be specified in MiB per day and is turned off by default
(`-maxuploadtarget=0`).
The recommended minimum is 144 * MAX_BLOCK_SIZE (currently 144MB) per day.

Whitelisted peers will never be disconnected, although their traffic counts for
calculating the target.

A more detailed documentation about keeping traffic low can be found in
[/doc/reduce-traffic.md](/doc/reduce-traffic.md).

Direct headers announcement (BIP 130)
-------------------------------------

Between compatible peers, [BIP 130]
(https://github.com/bitcoin/bips/blob/master/bip-0130.mediawiki)
direct headers announcement is used. This means that blocks are advertised by
announcing their headers directly, instead of just announcing the hash. In a
reorganization, all new headers are sent, instead of just the new tip. This
can often prevent an extra roundtrip before the actual block is downloaded.

Memory pool limiting
--------------------

Previous versions of Bitcoin Core had their mempool limited by checking
a transaction's fees against the node's minimum relay fee. There was no
upper bound on the size of the mempool and attackers could send a large
number of transactions paying just slighly more than the default minimum
relay fee to crash nodes with relatively low RAM. A temporary workaround
for previous versions of Bitcoin Core was to raise the default minimum
relay fee.

Bitcoin Core 0.12 will have a strict maximum size on the mempool. The
default value is 300 MB and can be configured with the `-maxmempool`
parameter. Whenever a transaction would cause the mempool to exceed
its maximum size, the transaction that (along with in-mempool descendants) has
the lowest total feerate (as a package) will be evicted and the node's effective
minimum relay feerate will be increased to match this feerate plus the initial
minimum relay feerate. The initial minimum relay feerate is set to
1000 satoshis per kB.

Bitcoin Core 0.12 also introduces new default policy limits on the length and
size of unconfirmed transaction chains that are allowed in the mempool
(generally limiting the length of unconfirmed chains to 25 transactions, with a
total size of 101 KB).  These limits can be overriden using command line
arguments; see the extended help (`--help -help-debug`) for more information.

Opt-in Replace-by-fee transactions
----------------------------------

It is now possible to replace transactions in the transaction memory pool of
Bitcoin Core 0.12 nodes. Bitcoin Core will only allow replacement of
transactions which have any of their inputs' `nSequence` number set to less
than `0xffffffff - 1`.  Moreover, a replacement transaction may only be
accepted when it pays sufficient fee, as described in [BIP 125]
(https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki).

Transaction replacement can be disabled with a new command line option,
`-mempoolreplacement=0`.  Transactions signaling replacement under BIP125 will
still be allowed into the mempool in this configuration, but replacements will
be rejected.  This option is intended for miners who want to continue the
transaction selection behavior of previous releases.

The `-mempoolreplacement` option is *not recommended* for wallet users seeking
to avoid receipt of unconfirmed opt-in transactions, because this option does
not prevent transactions which are replaceable under BIP 125 from being accepted
(only subsequent replacements, which other nodes on the network that implement
BIP 125 are likely to relay and mine).  Wallet users wishing to detect whether
a transaction is subject to replacement under BIP 125 should instead use the
updated RPC calls `gettransaction` and `listtransactions`, which now have an
additional field in the output indicating if a transaction is replaceable under
BIP125 ("bip125-replaceable").

Note that the wallet in Bitcoin Core 0.12 does not yet have support for
creating transactions that would be replaceable under BIP 125.


RPC: Random-cookie RPC authentication
-------------------------------------

When no `-rpcpassword` is specified, the daemon now uses a special 'cookie'
file for authentication. This file is generated with random content when the
daemon starts, and deleted when it exits. Its contents are used as
authentication token. Read access to this file controls who can access through
RPC. By default it is stored in the data directory but its location can be
overridden with the option `-rpccookiefile`.

This is similar to Tor's CookieAuthentication: see
https://www.torproject.org/docs/tor-manual.html.en

This allows running bitcoind without having to do any manual configuration.

Relay: Any sequence of pushdatas in OP_RETURN outputs now allowed
-----------------------------------------------------------------

Previously OP_RETURN outputs with a payload were only relayed and mined if they
had a single pushdata. This restriction has been lifted to allow any
combination of data pushes and numeric constant opcodes (OP_1 to OP_16) after
the OP_RETURN. The limit on OP_RETURN output size is now applied to the entire
serialized scriptPubKey, 83 bytes by default. (the previous 80 byte default plus
three bytes overhead)

Relay: New and only new blocks relayed when pruning
---------------------------------------------------

When running in pruned mode, the client will now relay new blocks. When
responding to the `getblocks` message, only hashes of blocks that are on disk
and are likely to remain there for some reasonable time window (1 hour) will be
returned (previously all relevant hashes were returned).

Relay and Mining: Priority transactions
---------------------------------------

Bitcoin Core has a heuristic 'priority' based on coin value and age. This
calculation is used for relaying of transactions which do not pay the
minimum relay fee, and can be used as an alternative way of sorting
transactions for mined blocks. Bitcoin Core will relay transactions with
insufficient fees depending on the setting of `-limitfreerelay=<r>` (default:
`r=15` kB per minute) and `-blockprioritysize=<s>`.

In Bitcoin Core 0.12, when mempool limit has been reached a higher minimum
relay fee takes effect to limit memory usage. Transactions which do not meet
this higher effective minimum relay fee will not be relayed or mined even if
they rank highly according to the priority heuristic.

The mining of transactions based on their priority is also now disabled by
default. To re-enable it, simply set `-blockprioritysize=<n>` where is the size
in bytes of your blocks to reserve for these transactions. The old default was
50k, so to retain approximately the same policy, you would set
`-blockprioritysize=50000`.

Additionally, as a result of computational simplifications, the priority value
used for transactions received with unconfirmed inputs is lower than in prior
versions due to avoiding recomputing the amounts as input transactions confirm.

External miner policy set via the `prioritisetransaction` RPC to rank
transactions already in the mempool continues to work as it has previously.
Note, however, that if mining priority transactions is left disabled, the
priority delta will be ignored and only the fee metric will be effective.

This internal automatic prioritization handling is being considered for removal
entirely in Bitcoin Core 0.13, and it is at this time undecided whether the
more accurate priority calculation for chained unconfirmed transactions will be
restored. Community direction on this topic is particularly requested to help
set project priorities.

Automatically use Tor hidden services
-------------------------------------

Starting with Tor version 0.2.7.1 it is possible, through Tor's control socket
API, to create and destroy 'ephemeral' hidden services programmatically.
Bitcoin Core has been updated to make use of this.

This means that if Tor is running (and proper authorization is available),
Bitcoin Core automatically creates a hidden service to listen on, without
manual configuration. Bitcoin Core will also use Tor automatically to connect
to other .onion nodes if the control socket can be successfully opened. This
will positively affect the number of available .onion nodes and their usage.

This new feature is enabled by default if Bitcoin Core is listening, and
a connection to Tor can be made. It can be configured with the `-listenonion`,
`-torcontrol` and `-torpassword` settings. To show verbose debugging
information, pass `-debug=tor`.

Notifications through ZMQ
-------------------------

Bitcoind can now (optionally) asynchronously notify clients through a
ZMQ-based PUB socket of the arrival of new transactions and blocks.
This feature requires installation of the ZMQ C API library 4.x and
configuring its use through the command line or configuration file.
Please see [docs/zmq.md](/doc/zmq.md) for details of operation.

Wallet: Transaction fees
------------------------

Various improvements have been made to how the wallet calculates
transaction fees.

Users can decide to pay a predefined fee rate by setting `-paytxfee=<n>`
(or `settxfee <n>` rpc during runtime). A value of `n=0` signals Bitcoin
Core to use floating fees. By default, Bitcoin Core will use floating
fees.

Based on past transaction data, floating fees approximate the fees
required to get into the `m`th block from now. This is configurable
with `-txconfirmtarget=<m>` (default: `2`).

Sometimes, it is not possible to give good estimates, or an estimate
at all. Therefore, a fallback value can be set with `-fallbackfee=<f>`
(default: `0.0002` BTC/kB).

At all times, Bitcoin Core will cap fees at `-maxtxfee=<x>` (default:
0.10) BTC.
Furthermore, Bitcoin Core will never create transactions paying less than
the current minimum relay fee.
Finally, a user can set the minimum fee rate for all transactions with
`-mintxfee=<i>`, which defaults to 1000 satoshis per kB.

Wallet: Negative confirmations and conflict detection
-----------------------------------------------------

The wallet will now report a negative number for confirmations that indicates
how deep in the block chain the conflict is found. For example, if a transaction
A has 5 confirmations and spends the same input as a wallet transaction B, B
will be reported as having -5 confirmations. If another wallet transaction C
spends an output from B, it will also be reported as having -5 confirmations.
To detect conflicts with historical transactions in the chain a one-time
`-rescan` may be needed.

Unlike earlier versions, unconfirmed but non-conflicting transactions will never
get a negative confirmation count. They are not treated as spendable unless
they're coming from ourself (change) and accepted into our local mempool,
however. The new "trusted" field in the `listtransactions` RPC output
indicates whether outputs of an unconfirmed transaction are considered
spendable.

Wallet: Merkle branches removed
-------------------------------

Previously, every wallet transaction stored a Merkle branch to prove its
presence in blocks. This wasn't being used for more than an expensive
sanity check. Since 0.12, these are no longer stored. When loading a
0.12 wallet into an older version, it will automatically rescan to avoid
failed checks.

Wallet: Pruning
---------------

With 0.12 it is possible to use wallet functionality in pruned mode.
This can reduce the disk usage from currently around 60 GB to
around 2 GB.

However, rescans as well as the RPCs `importwallet`, `importaddress`,
`importprivkey` are disabled.

To enable block pruning set `prune=<N>` on the command line or in
`bitcoin.conf`, where `N` is the number of MiB to allot for
raw block & undo data.

A value of 0 disables pruning. The minimal value above 0 is 550. Your
wallet is as secure with high values as it is with low ones. Higher
values merely ensure that your node will not shut down upon blockchain
reorganizations of more than 2 days - which are unlikely to happen in
practice. In future releases, a higher value may also help the network
as a whole: stored blocks could be served to other nodes.

For further information about pruning, you may also consult the [release
notes of v0.11.0](https://github.com/bitcoin/bitcoin/blob/v0.11.0/doc/release-notes.md#block-file-pruning).

`NODE_BLOOM` service bit
------------------------

Support for the `NODE_BLOOM` service bit, as described in [BIP
111](https://github.com/bitcoin/bips/blob/master/bip-0111.mediawiki), has been
added to the P2P protocol code.

BIP 111 defines a service bit to allow peers to advertise that they support
bloom filters (such as used by SPV clients) explicitly. It also bumps the protocol
version to allow peers to identify old nodes which allow bloom filtering of the
connection despite lacking the new service bit.

In this version, it is only enforced for peers that send protocol versions
`>=70011`. For the next major version it is planned that this restriction will be
removed. It is recommended to update SPV clients to check for the `NODE_BLOOM`
service bit for nodes that report versions newer than 70011.

Option parsing behavior
-----------------------

Command line options are now parsed strictly in the order in which they are
specified. It used to be the case that `-X -noX` ends up, unintuitively, with X
set, as `-X` had precedence over `-noX`. This is no longer the case. Like for
other software, the last specified value for an option will hold.

RPC: Low-level API changes
--------------------------

- Monetary amounts can be provided as strings. This means that for example the
  argument to sendtoaddress can be "0.0001" instead of 0.0001. This can be an
  advantage if a JSON library insists on using a lossy floating point type for
  numbers, which would be dangerous for monetary amounts.

* The `asm` property of each scriptSig now contains the decoded signature hash
  type for each signature that provides a valid defined hash type.

* OP_NOP2 has been renamed to OP_CHECKLOCKTIMEVERIFY by [BIP 65](https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki)

The following items contain assembly representations of scriptSig signatures
and are affected by this change:

- RPC `getrawtransaction`
- RPC `decoderawtransaction`
- RPC `decodescript`
- REST `/rest/tx/` (JSON format)
- REST `/rest/block/` (JSON format when including extended tx details)
- `bitcoin-tx -json`

For example, the `scriptSig.asm` property of a transaction input that
previously showed an assembly representation of:

    304502207fa7a6d1e0ee81132a269ad84e68d695483745cde8b541e3bf630749894e342a022100c1f7ab20e13e22fb95281a870f3dcf38d782e53023ee313d741ad0cfbc0c509001 400000 OP_NOP2

now shows as:

    304502207fa7a6d1e0ee81132a269ad84e68d695483745cde8b541e3bf630749894e342a022100c1f7ab20e13e22fb95281a870f3dcf38d782e53023ee313d741ad0cfbc0c5090[ALL] 400000 OP_CHECKLOCKTIMEVERIFY

Note that the output of the RPC `decodescript` did not change because it is
configured specifically to process scriptPubKey and not scriptSig scripts.

RPC: SSL support dropped
------------------------

SSL support for RPC, previously enabled by the option `rpcssl` has been dropped
from both the client and the server. This was done in preparation for removing
the dependency on OpenSSL for the daemon completely.

Trying to use `rpcssl` will result in an error:

    Error: SSL mode for RPC (-rpcssl) is no longer supported.

If you are one of the few people that relies on this feature, a flexible
migration path is to use `stunnel`. This is an utility that can tunnel
arbitrary TCP connections inside SSL. On e.g. Ubuntu it can be installed with:

    sudo apt-get install stunnel4

Then, to tunnel a SSL connection on 28332 to a RPC server bound on localhost on port 18332 do:

    stunnel -d 28332 -r 127.0.0.1:18332 -p stunnel.pem -P ''

It can also be set up system-wide in inetd style.

Another way to re-attain SSL would be to setup a httpd reverse proxy. This solution
would allow the use of different authentication, loadbalancing, on-the-fly compression and
caching. A sample config for apache2 could look like:

    Listen 443

    NameVirtualHost *:443
    <VirtualHost *:443>

    SSLEngine On
    SSLCertificateFile /etc/apache2/ssl/server.crt
    SSLCertificateKeyFile /etc/apache2/ssl/server.key

    <Location /bitcoinrpc>
        ProxyPass http://127.0.0.1:8332/
        ProxyPassReverse http://127.0.0.1:8332/
        # optional enable digest auth
        # AuthType Digest
        # ...

        # optional bypass bitcoind rpc basic auth
        # RequestHeader set Authorization "Basic <hash>"
        # get the <hash> from the shell with: base64 <<< bitcoinrpc:<password>
    </Location>

    # Or, balance the load:
    # ProxyPass / balancer://balancer_cluster_name

    </VirtualHost>

Mining Code Changes
-------------------

The mining code in 0.12 has been optimized to be significantly faster and use less
memory. As part of these changes, consensus critical calculations are cached on a
transaction's acceptance into the mempool and the mining code now relies on the
consistency of the mempool to assemble blocks. However all blocks are still tested
for validity after assembly.

Other P2P Changes
-----------------

The list of banned peers is now stored on disk rather than in memory.
Restarting bitcoind will no longer clear out the list of banned peers; instead
a new RPC call (`clearbanned`) can be used to manually clear the list.  The new
`setban` RPC call can also be used to manually ban or unban a peer.

0.12.0 Change log
=================

Detailed release notes follow. This overview includes changes that affect
behavior, not code moves, refactors and string updates. For convenience in locating
the code changes and accompanying discussion, both the pull request and
git merge commit are mentioned.

### RPC and REST

- #6121 `466f0ea` Convert entire source tree from json_spirit to UniValue (Jonas Schnelli)
- #6234 `d38cd47` fix rpcmining/getblocktemplate univalue transition logic error (Jonas Schnelli)
- #6239 `643114f` Don't go through double in AmountFromValue and ValueFromAmount (Wladimir J. van der Laan)
- #6266 `ebab5d3` Fix univalue handling of \u0000 characters. (Daniel Kraft)
- #6276 `f3d4dbb` Fix getbalance * 0 (Tom Harding)
- #6257 `5ebe7db` Add `paytxfee` and `errors` JSON fields where appropriate (Stephen)
- #6271 `754aae5` New RPC command disconnectnode (Alex van der Peet)
- #6158 `0abfa8a` Add setban/listbanned RPC commands (Jonas Schnelli)
- #6307 `7ecdcd9` rpcban fixes (Jonas Schnelli)
- #6290 `5753988` rpc: make `gettxoutsettinfo` run lock-free (Wladimir J. van der Laan)
- #6262 `247b914` Return all available information via RPC call "validateaddress" (dexX7)
- #6339 `c3f0490` UniValue: don't escape solidus, keep espacing of reverse solidus (Jonas Schnelli)
- #6353 `6bcb0a2` Show softfork status in getblockchaininfo (Wladimir J. van der Laan)
- #6247 `726e286` Add getblockheader RPC call (Peter Todd)
- #6362 `d6db115` Fix null id in RPC response during startup (Forrest Voight)
- #5486 `943b322` [REST] JSON support for /rest/headers (Jonas Schnelli)
- #6379 `c52e8b3` rpc: Accept scientific notation for monetary amounts in JSON (Wladimir J. van der Laan)
- #6388 `fd5dfda` rpc: Implement random-cookie based authentication (Wladimir J. van der Laan)
- #6457 `3c923e8` Include pruned state in chaininfo.json (Simon Males)
- #6456 `bfd807f` rpc: Avoid unnecessary parsing roundtrip in number formatting, fix locale issue (Wladimir J. van der Laan)
- #6380 `240b30e` rpc: Accept strings in AmountFromValue (Wladimir J. van der Laan)
- #6346 `6bb2805` Add OP_RETURN support in createrawtransaction RPC call, add tests. (paveljanik)
- #6013 `6feeec1` [REST] Add memory pool API (paveljanik)
- #6576 `da9beb2` Stop parsing JSON after first finished construct. (Daniel Kraft)
- #5677 `9aa9099` libevent-based http server (Wladimir J. van der Laan)
- #6633 `bbc2b39` Report minimum ping time in getpeerinfo (Matt Corallo)
- #6648 `cd381d7` Simplify logic of REST request suffix parsing. (Daniel Kraft)
- #6695 `5e21388` libevent http fixes (Wladimir J. van der Laan)
- #5264 `48efbdb` show scriptSig signature hash types in transaction decodes. fixes #3166 (mruddy)
- #6719 `1a9f19a` Make HTTP server shutdown more graceful (Wladimir J. van der Laan)
- #6859 `0fbfc51` http: Restrict maximum size of http + headers (Wladimir J. van der Laan)
- #5936 `bf7c195` [RPC] Add optional locktime to createrawtransaction (Tom Harding)
- #6877 `26f5b34` rpc: Add maxmempool and effective min fee to getmempoolinfo (Wladimir J. van der Laan)
- #6970 `92701b3` Fix crash in validateaddress with -disablewallet (Wladimir J. van der Laan)
- #5574 `755b4ba` Expose GUI labels in RPC as comments (Luke-Jr)
- #6990 `dbd2c13` http: speed up shutdown (Wladimir J. van der Laan)
- #7013 `36baa9f` Remove LOCK(cs_main) from decodescript (Peter Todd)
- #6999 `972bf9c` add (max)uploadtarget infos to getnettotals RPC help (Jonas Schnelli)
- #7011 `31de241` Add mediantime to getblockchaininfo (Peter Todd)
- #7065 `f91e29f` http: add Boost 1.49 compatibility (Wladimir J. van der Laan)
- #7087 `be281d8` [Net]Add -enforcenodebloom option (Patrick Strateman)
- #7044 `438ee59` RPC: Added additional config option for multiple RPC users. (Gregory Sanders)
- #7072 `c143c49` [RPC] Add transaction size to JSON output (Nikita Zhavoronkov)
- #7022 `9afbd96` Change default block priority size to 0 (Alex Morcos)
- #7141 `c0c08c7` rpc: Don't translate warning messages (Wladimir J. van der Laan)
- #7312 `fd4bd50` Add RPC call abandontransaction (Alex Morcos)
- #7222 `e25b158` RPC: indicate which transactions are replaceable (Suhas Daftuar)
- #7472 `b2f2b85` rpc: Add WWW-Authenticate header to 401 response (Wladimir J. van der Laan)
- #7469 `9cb31e6` net.h fix spelling: misbeha{b,v}ing (Matt)

### Configuration and command-line options

- #6164 `8d05ec7` Allow user to use -debug=1 to enable all debugging (lpescher)
- #5288 `4452205` Added `-whiteconnections=<n>` option (Josh Lehan)
- #6284 `10ac38e` Fix argument parsing oddity with -noX (Wladimir J. van der Laan)
- #6489 `c9c017a` Give a better error message if system clock is bad (Casey Rodarmor)
- #6462 `c384800` implement uacomment config parameter which can add comments to user agent as per BIP-0014 (Pavol Rusnak)
- #6647 `a3babc8` Sanitize uacomment (MarcoFalke)
- #6742 `3b2d37c` Changed logging to make -logtimestamps to work also for -printtoconsole (arnuschky)
- #6846 `2cd020d` alias -h for -help (Daniel Cousens)
- #6622 `7939164` Introduce -maxuploadtarget (Jonas Schnelli)
- #6881 `2b62551` Debug: Add option for microsecond precision in debug.log (Suhas Daftuar)
- #6776 `e06c14f` Support -checkmempool=N, which runs checks once every N transactions (Pieter Wuille)
- #6896 `d482c0a` Make -checkmempool=1 not fail through int32 overflow (Pieter Wuille)
- #6993 `b632145` Add -blocksonly option (Patrick Strateman)
- #7323 `a344880` 0.12: Backport -bytespersigop option (Luke-Jr)
- #7386 `da83ecd` Add option `-permitrbf` to set transaction replacement policy (Wladimir J. van der Laan)
- #7290 `b16b5bc` Add missing options help (MarcoFalke)
- #7440 `c76bfff` Rename permitrbf to mempoolreplacement and provide minimal string-list forward compatibility (Luke-Jr)

### Block and transaction handling

- #6203 `f00b623` Remove P2SH coinbase flag, no longer interesting (Luke-Jr)
- #6222 `9c93ee5` Explicitly set tx.nVersion for the genesis block and mining tests (Mark Friedenbach)
- #5985 `3a1d3e8` Fix removing of orphan transactions (Alex Morcos)
- #6221 `dd8fe82` Prune: Support noncontiguous block files (Adam Weiss)
- #6124 `41076aa` Mempool only CHECKLOCKTIMEVERIFY (BIP65) verification, unparameterized version (Peter Todd)
- #6329 `d0a10c1` acceptnonstdtxn option to skip (most) "non-standard transaction" checks, for testnet/regtest only (Luke-Jr)
- #6410 `7cdefb9` Implement accurate memory accounting for mempool (Pieter Wuille)
- #6444 `24ce77d` Exempt unspendable transaction outputs from dust checks (dexX7)
- #5913 `a0625b8` Add absurdly high fee message to validation state (Shaul Kfir)
- #6177 `2f746c6` Prevent block.nTime from decreasing (Mark Friedenbach)
- #6377 `e545371` Handle no chain tip available in InvalidChainFound() (Ross Nicoll)
- #6551 `39ddaeb` Handle leveldb::DestroyDB() errors on wipe failure (Adam Weiss)
- #6654 `b0ce450` Mempool package tracking (Suhas Daftuar)
- #6715 `82d2aef` Fix mempool packages (Suhas Daftuar)
- #6680 `4f44530` use CBlockIndex instead of uint256 for UpdatedBlockTip signal (Jonas Schnelli)
- #6650 `4fac576` Obfuscate chainstate (James O'Beirne)
- #6777 `9caaf6e` Unobfuscate chainstate data in CCoinsViewDB::GetStats (James O'Beirne)
- #6722 `3b20e23` Limit mempool by throwing away the cheapest txn and setting min relay fee to it (Matt Corallo)
- #6889 `38369dd` fix locking issue with new mempool limiting (Jonas Schnelli)
- #6464 `8f3b3cd` Always clean up manual transaction prioritization (Casey Rodarmor)
- #6865 `d0badb9` Fix chainstate serialized_size computation (Pieter Wuille)
- #6566 `ff057f4` BIP-113: Mempool-only median time-past as endpoint for lock-time calculations (Mark Friedenbach)
- #6934 `3038eb6` Restores mempool only BIP113 enforcement (Gregory Maxwell)
- #6965 `de7d459` Benchmark sanity checks and fork checks in ConnectBlock (Matt Corallo)
- #6918 `eb6172a` Make sigcache faster, more efficient, larger (Pieter Wuille)
- #6771 `38ed190` Policy: Lower default limits for tx chains (Alex Morcos)
- #6932 `73fa5e6` ModifyNewCoins saves database lookups (Alex Morcos)
- #5967 `05d5918` Alter assumptions in CCoinsViewCache::BatchWrite (Alex Morcos)
- #6871 `0e93586` nSequence-based Full-RBF opt-in (Peter Todd)
- #7008 `eb77416` Lower bound priority (Alex Morcos)
- #6915 `2ef5ffa` [Mempool] Improve removal of invalid transactions after reorgs (Suhas Daftuar)
- #6898 `4077ad2` Rewrite CreateNewBlock (Alex Morcos)
- #6872 `bdda4d5` Remove UTXO cache entries when the tx they were added for is removed/does not enter mempool (Matt Corallo)
- #7062 `12c469b` [Mempool] Fix mempool limiting and replace-by-fee for PrioritiseTransaction (Suhas Daftuar)
- #7276 `76de36f` Report non-mandatory script failures correctly (Pieter Wuille)
- #7217 `e08b7cb` Mark blocks with too many sigops as failed (Suhas Daftuar)
- #7387 `f4b2ce8` Get rid of inaccurate ScriptSigArgsExpected (Pieter Wuille)

### P2P protocol and network code

- #6172 `88a7ead` Ignore getheaders requests when not synced (Suhas Daftuar)
- #5875 `9d60602` Be stricter in processing unrequested blocks (Suhas Daftuar)
- #6256 `8ccc07c` Use best header chain timestamps to detect partitioning (Gavin Andresen)
- #6283 `a903ad7` make CAddrMan::size() return the correct type of size_t (Diapolo)
- #6272 `40400d5` Improve proxy initialization (continues #4871) (Wladimir J. van der Laan, Diapolo)
- #6310 `66e5465` banlist.dat: store banlist on disk (Jonas Schnelli)
- #6412 `1a2de32` Test whether created sockets are select()able (Pieter Wuille)
- #6498 `219b916` Keep track of recently rejected transactions with a rolling bloom filter (cont'd) (Peter Todd)
- #6556 `70ec975` Fix masking of irrelevant bits in address groups. (Alex Morcos)
- #6530 `ea19c2b` Improve addrman Select() performance when buckets are nearly empty (Pieter Wuille)
- #6583 `af9305a` add support for miniupnpc api version 14 (Pavel Vasin)
- #6374 `69dc5b5` Connection slot exhaustion DoS mitigation (Patrick Strateman)
- #6636 `536207f` net: correctly initialize nMinPingUsecTime (Wladimir J. van der Laan)
- #6579 `0c27795` Add NODE_BLOOM service bit and bump protocol version (Matt Corallo)
- #6148 `999c8be` Relay blocks when pruning (Suhas Daftuar)
- #6588 `cf9bb11` In (strCommand == "tx"), return if AlreadyHave() (Tom Harding)
- #6974 `2f71b07` Always allow getheaders from whitelisted peers (Wladimir J. van der Laan)
- #6639 `bd629d7` net: Automatically create hidden service, listen on Tor (Wladimir J. van der Laan)
- #6984 `9ffc687` don't enforce maxuploadtarget's disconnect for whitelisted peers (Jonas Schnelli)
- #7046 `c322652` Net: Improve blocks only mode. (Patrick Strateman)
- #7090 `d6454f6` Connect to Tor hidden services by default (when listening on Tor) (Peter Todd)
- #7106 `c894fbb` Fix and improve relay from whitelisted peers (Pieter Wuille)
- #7129 `5d5ef3a` Direct headers announcement (rebase of #6494) (Pieter Wuille)
- #7079 `1b5118b` Prevent peer flooding inv request queue (redux) (redux) (Gregory Maxwell)
- #7166 `6ba25d2` Disconnect on mempool requests from peers when over the upload limit. (Gregory Maxwell)
- #7133 `f31955d` Replace setInventoryKnown with a rolling bloom filter (rebase of #7100) (Pieter Wuille)
- #7174 `82aff88` Don't do mempool lookups for "mempool" command without a filter (Matt Corallo)
- #7179 `44fef99` net: Fix sent reject messages for blocks and transactions (Wladimir J. van der Laan)
- #7181 `8fc174a` net: Add and document network messages in protocol.h (Wladimir J. van der Laan)
- #7125 `10b88be` Replace global trickle node with random delays (Pieter Wuille)
- #7415 `cb83beb` net: Hardcoded seeds update January 2016 (Wladimir J. van der Laan)
- #7438 `e2d9a58` Do not absolutely protect local peers; decide group ties based on time (Gregory Maxwell)
- #7439 `86755bc` Add whitelistforcerelay to control forced relaying. [#7099 redux] (Gregory Maxwell)
- #7482 `e16f5b4` Ensure headers count is correct (Suhas Daftuar)

### Validation

- #5927 `8d9f0a6` Reduce checkpoints' effect on consensus. (Pieter Wuille)
- #6299 `24f2489` Bugfix: Don't check the genesis block header before accepting it (Jorge Timón)
- #6361 `d7ada03` Use real number of cores for default -par, ignore virtual cores (Wladimir J. van der Laan)
- #6519 `87f37e2` Make logging for validation optional (Wladimir J. van der Laan)
- #6351 `2a1090d` CHECKLOCKTIMEVERIFY (BIP65) IsSuperMajority() soft-fork (Peter Todd)
- #6931 `54e8bfe` Skip BIP 30 verification where not necessary (Alex Morcos)
- #6954 `e54ebbf` Switch to libsecp256k1-based ECDSA validation (Pieter Wuille)
- #6508 `61457c2` Switch to a constant-space Merkle root/branch algorithm. (Pieter Wuille)
- #6914 `327291a` Add pre-allocated vector type and use it for CScript (Pieter Wuille)
- #7500 `889e5b3` Correctly report high-S violations (Pieter Wuille)


### Build system

- #6210 `0e4f2a0` build: disable optional use of gmp in internal secp256k1 build (Wladimir J. van der Laan)
- #6214 `87406aa` [OSX] revert renaming of Bitcoin-Qt.app and use CFBundleDisplayName (partial revert of #6116) (Jonas Schnelli)
- #6218 `9d67b10` build/gitian misc updates (Cory Fields)
- #6269 `d4565b6` gitian: Use the new bitcoin-detached-sigs git repo for OSX signatures (Cory Fields)
- #6418 `d4a910c` Add autogen.sh to source tarball. (randy-waterhouse)
- #6373 `1ae3196` depends: non-qt bumps for 0.12 (Cory Fields)
- #6434 `059b352` Preserve user-passed CXXFLAGS with --enable-debug (Gavin Andresen)
- #6501 `fee6554` Misc build fixes (Cory Fields)
- #6600 `ef4945f` Include bitcoin-tx binary on Debian/Ubuntu (Zak Wilcox)
- #6619 `4862708` depends: bump miniupnpc and ccache (Michael Ford)
- #6801 `ae69a75` [depends] Latest config.guess and config.sub (Michael Ford)
- #6938 `193f7b5` build: If both Qt4 and Qt5 are installed, use Qt5 (Wladimir J. van der Laan)
- #7092 `348b281` build: Set osx permissions in the dmg to make Gatekeeper happy (Cory Fields)
- #6980 `eccd671` [Depends] Bump Boost, miniupnpc, ccache & zeromq (Michael Ford)
- #7424 `aa26ee0` Add security/export checks to gitian and fix current failures (Cory Fields)

### Wallet

- #6183 `87550ee` Fix off-by-one error w/ nLockTime in the wallet (Peter Todd)
- #6057 `ac5476e` re-enable wallet in autoprune (Jonas Schnelli)
- #6356 `9e6c33b` Delay initial pruning until after wallet init (Adam Weiss)
- #6088 `91389e5` fundrawtransaction (Matt Corallo)
- #6415 `ddd8d80` Implement watchonly support in fundrawtransaction (Matt Corallo)
- #6567 `0f0f323` Fix crash when mining with empty keypool. (Daniel Kraft)
- #6688 `4939eab` Fix locking in GetTransaction. (Alex Morcos)
- #6645 `4dbd43e` Enable wallet key imports without rescan in pruned mode. (Gregory Maxwell)
- #6550 `5b77244` Do not store Merkle branches in the wallet. (Pieter Wuille)
- #5924 `12a7712` Clean up change computation in CreateTransaction. (Daniel Kraft)
- #6906 `48b5b84` Reject invalid pubkeys when reading ckey items from the wallet. (Gregory Maxwell)
- #7010 `e0a5ef8` Fix fundrawtransaction handling of includeWatching (Peter Todd)
- #6851 `616d61b` Optimisation: Store transaction list order in memory rather than compute it every need (Luke-Jr)
- #6134 `e92377f` Improve usage of fee estimation code (Alex Morcos)
- #7103 `a775182` [wallet, rpc tests] Fix settxfee, paytxfee (MarcoFalke)
- #7105 `30c2d8c` Keep track of explicit wallet conflicts instead of using mempool (Pieter Wuille)
- #7096 `9490bd7` [Wallet] Improve minimum absolute fee GUI options (Jonas Schnelli)
- #6216 `83f06ca` Take the training wheels off anti-fee-sniping (Peter Todd)
- #4906 `96e8d12` Issue#1643: Coinselection prunes extraneous inputs from ApproximateBestSubset (Murch)
- #7200 `06c6a58` Checks for null data transaction before issuing error to debug.log (Andy Craze)
- #7296 `a36d79b` Add sane fallback for fee estimation (Alex Morcos)
- #7293 `ff9b610` Add regression test for vValue sort order (MarcoFalke)
- #7306 `4707797` Make sure conflicted wallet tx's update balances (Alex Morcos)
- #7381 `621bbd8` [walletdb] Fix syntax error in key parser (MarcoFalke)
- #7491 `00ec73e` wallet: Ignore MarkConflict if block hash is not known (Wladimir J. van der Laan)
- #7502 `1329963` Update the wallet best block marker before pruning (Pieter Wuille)

### GUI

- #6217 `c57e12a` disconnect peers from peers tab via context menu (Diapolo)
- #6209 `ab0ec67` extend rpc console peers tab (Diapolo)
- #6484 `1369d69` use CHashWriter also in SignVerifyMessageDialog (Pavel Vasin)
- #6487 `9848d42` Introduce PlatformStyle (Wladimir J. van der Laan)
- #6505 `100c9d3` cleanup icons (MarcoFalke)
- #4587 `0c465f5` allow users to set -onion via GUI (Diapolo)
- #6529 `c0f66ce` show client user agent in debug window (Diapolo)
- #6594 `878ea69` Disallow duplicate windows. (Casey Rodarmor)
- #5665 `6f55cdd` add verifySize() function to PaymentServer (Diapolo)
- #6317 `ca5e2a1` minor optimisations in peertablemodel (Diapolo)
- #6315 `e59d2a8` allow banning and unbanning over UI->peers table (Jonas Schnelli)
- #6653 `e04b2fa` Pop debug window in foreground when opened twice (MarcoFalke)
- #6864 `c702521` Use monospace font (MarcoFalke)
- #6887 `3694b74` Update coin control and smartfee labels (MarcoFalke)
- #7000 `814697c` add shortcurts for debug-/console-window (Jonas Schnelli)
- #6951 `03403d8` Use maxTxFee instead of 10000000 (MarcoFalke)
- #7051 `a190777` ui: Add "Copy raw transaction data" to transaction list context menu (Wladimir J. van der Laan)
- #6979 `776848a` simple mempool info in debug window (Jonas Schnelli)
- #7006 `26af1ac` add startup option to reset Qt settings (Jonas Schnelli)
- #6780 `2a94cd6` Call init's parameter interaction before we create the UI options model (Jonas Schnelli)
- #7112 `96b8025` reduce cs_main locks during tip update, more fluently update UI (Jonas Schnelli)
- #7206 `f43c2f9` Add "NODE_BLOOM" to guiutil so that peers don't get UNKNOWN[4] (Matt Corallo)
- #7282 `5cadf3e` fix coincontrol update issue when deleting a send coins entry (Jonas Schnelli)
- #7319 `1320300` Intro: Display required space (MarcoFalke)
- #7318 `9265e89` quickfix for RPC timer interface problem (Jonas Schnelli)
- #7327 `b16b5bc` [Wallet] Transaction View: LastMonth calculation fixed (crowning-)
- #7364 `7726c48` [qt] Windows: Make rpcconsole monospace font larger (MarcoFalke)
- #7384 `294f432` [qt] Peertable: Increase SUBVERSION_COLUMN_WIDTH (MarcoFalke)

### Tests and QA

- #6305 `9005c91` build: comparison tool swap (Cory Fields)
- #6318 `e307e13` build: comparison tool NPE fix (Cory Fields)
- #6337 `0564c5b` Testing infrastructure: mocktime fixes (Gavin Andresen)
- #6350 `60abba1` add unit tests for the decodescript rpc (mruddy)
- #5881 `3203a08` Fix and improve txn_doublespend.py test (Tom Harding)
- #6390 `6a73d66` tests: Fix bitcoin-tx signing test case (Wladimir J. van der Laan)
- #6368 `7fc25c2` CLTV: Add more tests to improve coverage (Esteban Ordano)
- #6414 `5121c68` Fix intermittent test failure, reduce test time (Tom Harding)
- #6417 `44fa82d` [QA] fix possible reorg issue in (fund)rawtransaction(s).py RPC test (Jonas Schnelli)
- #6398 `3d9362d` rpc: Remove chain-specific RequireRPCPassword (Wladimir J. van der Laan)
- #6428 `bb59e78` tests: Remove old sh-based test framework (Wladimir J. van der Laan)
- #5515 `d946e9a` RFC: Assert on probable deadlocks if the second lock isnt try_lock (Matt Corallo)
- #6287 `d2464df` Clang lock debug (Cory Fields)
- #6465 `410fd74` Don't share objects between TestInstances (Casey Rodarmor)
- #6534 `6c1c7fd` Fix test locking issues and un-revert the probable-deadlines assertions commit (Cory Fields)
- #6509 `bb4faee` Fix race condition on test node shutdown (Casey Rodarmor)
- #6523 `561f8af` Add p2p-fullblocktest.py (Casey Rodarmor)
- #6590 `981fd92` Fix stale socket rebinding and re-enable python tests for Windows (Cory Fields)
- #6730 `cb4d6d0` build: Remove dependency of bitcoin-cli on secp256k1 (Wladimir J. van der Laan)
- #6616 `5ab5dca` Regression Tests: Migrated rpc-tests.sh to all Python rpc-tests.py (Peter Tschipper)
- #6720 `d479311` Creates unittests for addrman, makes addrman more testable. (Ethan Heilman)
- #6853 `c834f56` Added fPowNoRetargeting field to Consensus::Params (Eric Lombrozo)
- #6827 `87e5539` [rpc-tests] Check return code (MarcoFalke)
- #6848 `f2c869a` Add DERSIG transaction test cases (Ross Nicoll)
- #6813 `5242bb3` Support gathering code coverage data for RPC tests with lcov (dexX7)
- #6888 `c8322ff` Clear strMiscWarning before running PartitionAlert (Eric Lombrozo)
- #6894 `2675276` [Tests] Fix BIP65 p2p test (Suhas Daftuar)
- #6863 `725539e` [Test Suite] Fix test for null tx input (Daniel Kraft)
- #6926 `a6d0d62` tests: Initialize networking on windows (Wladimir J. van der Laan)
- #6822 `9fa54a1` [tests] Be more strict checking dust (MarcoFalke)
- #6804 `5fcc14e` [tests] Add basic coverage reporting for RPC tests (James O'Beirne)
- #7045 `72dccfc` Bugfix: Use unique autostart filenames on Linux for testnet/regtest (Luke-Jr)
- #7095 `d8368a0` Replace scriptnum_test's normative ScriptNum implementation (Wladimir J. van der Laan)
- #7063 `6abf6eb` [Tests] Add prioritisetransaction RPC test (Suhas Daftuar)
- #7137 `16f4a6e` Tests: Explicitly set chain limits in replace-by-fee test (Suhas Daftuar)
- #7216 `9572e49` Removed offline testnet DNSSeed 'alexykot.me'. (tnull)
- #7209 `f3ad812` test: don't override BITCOIND and BITCOINCLI if they're set (Wladimir J. van der Laan)
- #7226 `301f16a` Tests: Add more tests to p2p-fullblocktest (Suhas Daftuar)
- #7153 `9ef7c54` [Tests] Add mempool_limit.py test (Jonas Schnelli)
- #7170 `453c567` tests: Disable Tor interaction (Wladimir J. van der Laan)
- #7229 `1ed938b` [qa] wallet: Check if maintenance changes the balance (MarcoFalke)
- #7308 `d513405` [Tests] Eliminate intermittent failures in sendheaders.py (Suhas Daftuar)
- #7468 `947c4ff` [rpc-tests] Change solve() to use rehash (Brad Andrews)

### Miscellaneous

- #6213 `e54ff2f` [init] add -blockversion help and extend -upnp help (Diapolo)
- #5975 `1fea667` Consensus: Decouple ContextualCheckBlockHeader from checkpoints (Jorge Timón)
- #6061 `eba2f06` Separate Consensus::CheckTxInputs and GetSpendHeight in CheckInputs (Jorge Timón)
- #5994 `786ed11` detach wallet from miner (Jonas Schnelli)
- #6387 `11576a5` [bitcoin-cli] improve error output (Jonas Schnelli)
- #6401 `6db53b4` Add BITCOIND_SIGTERM_TIMEOUT to OpenRC init scripts (Florian Schmaus)
- #6430 `b01981e` doc: add documentation for shared library libbitcoinconsensus (Braydon Fuller)
- #6372 `dcc495e` Update Linearize tool to support Windows paths; fix variable scope; update README and example configuration (Paul Georgiou)
- #6453 `8fe5cce` Separate core memory usage computation in core_memusage.h (Pieter Wuille)
- #6149 `633fe10` Buffer log messages and explicitly open logs (Adam Weiss)
- #6488 `7cbed7f` Avoid leaking file descriptors in RegisterLoad (Casey Rodarmor)
- #6497 `a2bf40d` Make sure LogPrintf strings are line-terminated (Wladimir J. van der Laan)
- #6504 `b6fee6b` Rationalize currency unit to "BTC" (Ross Nicoll)
- #6507 `9bb4dd8` Removed contrib/bitrpc (Casey Rodarmor)
- #6527 `41d650f` Use unique name for AlertNotify tempfile (Casey Rodarmor)
- #6561 `e08a7d9` limitedmap fixes and tests (Casey Rodarmor)
- #6565 `a6f2aff` Make sure we re-acquire lock if a task throws (Casey Rodarmor)
- #6599 `f4d88c4` Make sure LogPrint strings are line-terminated (Ross Nicoll)
- #6630 `195942d` Replace boost::reverse_lock with our own (Casey Rodarmor)
- #6103 `13b8282` Add ZeroMQ notifications (João Barbosa)
- #6692 `d5d1d2e` devtools: don't push if signing fails in github-merge (Wladimir J. van der Laan)
- #6728 `2b0567b` timedata: Prevent warning overkill (Wladimir J. van der Laan)
- #6713 `f6ce59c` SanitizeString: Allow hypen char (MarcoFalke)
- #5987 `4899a04` Bugfix: Fix testnet-in-a-box use case (Luke-Jr)
- #6733 `b7d78fd` Simple benchmarking framework (Gavin Andresen)
- #6854 `a092970` devtools: Add security-check.py (Wladimir J. van der Laan)
- #6790 `fa1d252` devtools: add clang-format.py (MarcoFalke)
- #7114 `f3d0fdd` util: Don't set strMiscWarning on every exception (Wladimir J. van der Laan)
- #7078 `93e0514` uint256::GetCheapHash bigendian compatibility (arowser)
- #7094 `34e02e0` Assert now > 0 in GetTime GetTimeMillis GetTimeMicros (Patrick Strateman)

Credits
=======

Thanks to everyone who directly contributed to this release:

- accraze
- Adam Weiss
- Alex Morcos
- Alex van der Peet
- AlSzacrel
- Altoidnerd
- Andriy Voskoboinyk
- antonio-fr
- Arne Brutschy
- Ashley Holman
- Bob McElrath
- Braydon Fuller
- BtcDrak
- Casey Rodarmor
- centaur1
- Chris Kleeschulte
- Christian Decker
- Cory Fields
- crowning-
- daniel
- Daniel Cousens
- Daniel Kraft
- David Hill
- dexX7
- Diego Viola
- Elias Rohrer
- Eric Lombrozo
- Erik Mossberg
- Esteban Ordano
- EthanHeilman
- Florian Schmaus
- Forrest Voight
- Gavin Andresen
- Gregory Maxwell
- Gregory Sanders / instagibbs
- Ian T
- Irving Ruan
- Jacob Welsh
- James O'Beirne
- Jeff Garzik
- Johnathan Corgan
- Jonas Schnelli
- Jonathan Cross
- João Barbosa
- Jorge Timón
- Josh Lehan
- J Ross Nicoll
- kazcw
- Kevin Cooper
- lpescher
- Luke Dashjr
- MarcoFalke
- Mark Friedenbach
- Matt
- Matt Bogosian
- Matt Corallo
- Matt Quinn
- Micha
- Michael
- Michael Ford / fanquake
- Midnight Magic
- Mitchell Cash
- mrbandrews
- mruddy
- Nick
- Patrick Strateman
- Paul Georgiou
- Paul Rabahy
- Pavel Janík / paveljanik
- Pavel Vasin
- Pavol Rusnak
- Peter Josling
- Peter Todd
- Philip Kaufmann
- Pieter Wuille
- ptschip
- randy-waterhouse
- rion
- Ross Nicoll
- Ryan Havar
- Shaul Kfir
- Simon Males
- Stephen
- Suhas Daftuar
- tailsjoin
- Thomas Kerin
- Tom Harding
- tulip
- unsystemizer
- Veres Lajos
- Wladimir J. van der Laan
- xor-freenet
- Zak Wilcox
- zathras-crypto

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).
Bitcoin Core version 0.11.2 is now available from:

  <https://bitcoin.org/bin/bitcoin-core-0.11.2/>

This is a new minor version release, bringing bug fixes, the BIP65
(CLTV) consensus change, and relay policy preparation for BIP113. It is
recommended to upgrade to this version as soon as possible.

Please report bugs using the issue tracker at github:

  <https://github.com/bitcoin/bitcoin/issues>

Upgrading and downgrading
=========================

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

Downgrade warning
------------------

Because release 0.10.0 and later makes use of headers-first synchronization and
parallel block download (see further), the block files and databases are not
backwards-compatible with pre-0.10 versions of Bitcoin Core or other software:

* Blocks will be stored on disk out of order (in the order they are
received, really), which makes it incompatible with some tools or
other programs. Reindexing using earlier versions will also not work
anymore as a result of this.

* The block index database will now hold headers for which no block is
stored on disk, which earlier versions won't support.

If you want to be able to downgrade smoothly, make a backup of your entire data
directory. Without this your node will need start syncing (or importing from
bootstrap.dat) anew afterwards. It is possible that the data from a completely
synchronised 0.10 node may be usable in older versions as-is, but this is not
supported and may break as soon as the older version attempts to reindex.

This does not affect wallet forward or backward compatibility. There are no
known problems when downgrading from 0.11.x to 0.10.x.

Notable changes since 0.11.1
============================

BIP65 soft fork to enforce OP_CHECKLOCKTIMEVERIFY opcode
--------------------------------------------------------

This release includes several changes related to the [BIP65][] soft fork
which redefines the existing OP_NOP2 opcode as OP_CHECKLOCKTIMEVERIFY
(CLTV) so that a transaction output can be made unspendable until a
specified point in the future.

1. This release will only relay and mine transactions spending a CLTV
   output if they comply with the BIP65 rules as provided in code.

2. This release will produce version 4 blocks by default. Please see the
   *notice to miners* below.

3. Once 951 out of a sequence of 1,001 blocks on the local node's best block
   chain contain version 4 (or higher) blocks, this release will no
   longer accept new version 3 blocks and it will only accept version 4
   blocks if they comply with the BIP65 rules for CLTV.

For more information about the soft-forking change, please see
<https://github.com/bitcoin/bitcoin/pull/6351>

Graphs showing the progress towards block version 4 adoption may be
found at the URLs below:

- Block versions over the last 50,000 blocks as progress towards BIP65
  consensus enforcement: <http://bitcoin.sipa.be/ver-50k.png>

- Block versions over the last 2,000 blocks showing the days to the
  earliest possible BIP65 consensus-enforced block: <http://bitcoin.sipa.be/ver-2k.png>

**Notice to miners:** Bitcoin Core’s block templates are now for
version 4 blocks only, and any mining software relying on its
getblocktemplate must be updated in parallel to use libblkmaker either
version 0.4.3 or any version from 0.5.2 onward.

- If you are solo mining, this will affect you the moment you upgrade
  Bitcoin Core, which must be done prior to BIP65 achieving its 951/1001
  status.

- If you are mining with the stratum mining protocol: this does not
  affect you.

- If you are mining with the getblocktemplate protocol to a pool: this
  will affect you at the pool operator’s discretion, which must be no
  later than BIP65 achieving its 951/1001 status.

[BIP65]: https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki

BIP113 mempool-only locktime enforcement using GetMedianTimePast()
----------------------------------------------------------------

Bitcoin transactions currently may specify a locktime indicating when
they may be added to a valid block.  Current consensus rules require
that blocks have a block header time greater than the locktime specified
in any transaction in that block.

Miners get to choose what time they use for their header time, with the
consensus rule being that no node will accept a block whose time is more
than two hours in the future.  This creates a incentive for miners to
set their header times to future values in order to include locktimed
transactions which weren't supposed to be included for up to two more
hours.

The consensus rules also specify that valid blocks may have a header
time greater than that of the median of the 11 previous blocks.  This
GetMedianTimePast() time has a key feature we generally associate with
time: it can't go backwards.

[BIP113][] specifies a soft fork (**not enforced in this release**) that
weakens this perverse incentive for individual miners to use a future
time by requiring that valid blocks have a computed GetMedianTimePast()
greater than the locktime specified in any transaction in that block.

Mempool inclusion rules currently require transactions to be valid for
immediate inclusion in a block in order to be accepted into the mempool.
This release begins applying the BIP113 rule to received transactions,
so transaction whose time is greater than the GetMedianTimePast() will
no longer be accepted into the mempool.

**Implication for miners:** you will begin rejecting transactions that
would not be valid under BIP113, which will prevent you from producing
invalid blocks if/when BIP113 is enforced on the network. Any
transactions which are valid under the current rules but not yet valid
under the BIP113 rules will either be mined by other miners or delayed
until they are valid under BIP113. Note, however, that time-based
locktime transactions are more or less unseen on the network currently.

**Implication for users:** GetMedianTimePast() always trails behind the
current time, so a transaction locktime set to the present time will be
rejected by nodes running this release until the median time moves
forward. To compensate, subtract one hour (3,600 seconds) from your
locktimes to allow those transactions to be included in mempools at
approximately the expected time.

[BIP113]: https://github.com/bitcoin/bips/blob/master/bip-0113.mediawiki

Windows bug fix for corrupted UTXO database on unclean shutdowns
----------------------------------------------------------------

Several Windows users reported that they often need to reindex the
entire blockchain after an unclean shutdown of Bitcoin Core on Windows
(or an unclean shutdown of Windows itself). Although unclean shutdowns
remain unsafe, this release no longer relies on memory-mapped files for
the UTXO database, which significantly reduced the frequency of unclean
shutdowns leading to required reindexes during testing.

For more information, see: <https://github.com/bitcoin/bitcoin/pull/6917>

Other fixes for database corruption on Windows are expected in the
next major release.

0.11.2 Change log
=================

Detailed release notes follow. This overview includes changes that affect
behavior, not code moves, refactors and string updates. For convenience in locating
the code changes and accompanying discussion, both the pull request and
git merge commit are mentioned.

- #6124 `684636b` Make CScriptNum() take nMaxNumSize as an argument
- #6124 `4fa7a04` Replace NOP2 with CHECKLOCKTIMEVERIFY (BIP65)
- #6124 `6ea5ca4` Enable CHECKLOCKTIMEVERIFY as a standard script verify flag
- #6351 `5e82e1c` Add CHECKLOCKTIMEVERIFY (BIP65) soft-fork logic
- #6353 `ba1da90` Show softfork status in getblockchaininfo
- #6351 `6af25b0` Add BIP65 to getblockchaininfo softforks list
- #6688 `01878c9` Fix locking in GetTransaction
- #6653 `b3eaa30` [Qt] Raise debug window when requested
- #6600 `1e672ae` Debian/Ubuntu: Include bitcoin-tx binary
- #6600 `2394f4d` Debian/Ubuntu: Split bitcoin-tx into its own package
- #5987 `33d6825` Bugfix: Allow mining on top of old tip blocks for testnet
- #6852 `21e58b8` build: make sure OpenSSL heeds noexecstack
- #6846 `af6edac` alias `-h` for `--help`
- #6867 `95a5039` Set TCP_NODELAY on P2P sockets.
- #6856 `dfe55bd` Do not allow blockfile pruning during reindex.
- #6566 `a1d3c6f` Add rules--presently disabled--for using GetMedianTimePast as end point for lock-time calculations
- #6566 `f720c5f` Enable policy enforcing GetMedianTimePast as the end point of lock-time constraints
- #6917 `0af5b8e` leveldb: Win32WritableFile without memory mapping
- #6948 `4e895b0` Always flush block and undo when switching to new file

Credits
=======

Thanks to everyone who directly contributed to this release:

- Alex Morcos
- ฿tcDrak
- Chris Kleeschulte
- Daniel Cousens
- Diego Viola
- Eric Lombrozo
- Esteban Ordano
- Gregory Maxwell
- Luke Dashjr
- Marco Falke
- Mark Friedenbach
- Matt Corallo
- Micha
- Mitchell Cash
- Peter Todd
- Pieter Wuille
- Wladimir J. van der Laan
- Zak Wilcox

And those who contributed additional code review and/or security research.

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).
Bitcoin Core version 0.11.1 is now available from:

  <https://bitcoin.org/bin/bitcoin-core-0.11.1/>

This is a new minor version release, bringing security fixes. It is recommended
to upgrade to this version as soon as possible.

Please report bugs using the issue tracker at github:

  <https://github.com/bitcoin/bitcoin/issues>

Upgrading and downgrading
=========================

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

Downgrade warning
------------------

Because release 0.10.0 and later makes use of headers-first synchronization and
parallel block download (see further), the block files and databases are not
backwards-compatible with pre-0.10 versions of Bitcoin Core or other software:

* Blocks will be stored on disk out of order (in the order they are
received, really), which makes it incompatible with some tools or
other programs. Reindexing using earlier versions will also not work
anymore as a result of this.

* The block index database will now hold headers for which no block is
stored on disk, which earlier versions won't support.

If you want to be able to downgrade smoothly, make a backup of your entire data
directory. Without this your node will need start syncing (or importing from
bootstrap.dat) anew afterwards. It is possible that the data from a completely
synchronised 0.10 node may be usable in older versions as-is, but this is not
supported and may break as soon as the older version attempts to reindex.

This does not affect wallet forward or backward compatibility. There are no
known problems when downgrading from 0.11.x to 0.10.x.

Notable changes
===============

Fix buffer overflow in bundled upnp
------------------------------------

Bundled miniupnpc was updated to 1.9.20151008. This fixes a buffer overflow in
the XML parser during initial network discovery.

Details can be found here: http://talosintel.com/reports/TALOS-2015-0035/

This applies to the distributed executables only, not when building from source or
using distribution provided packages.

Additionally, upnp has been disabled by default. This may result in a lower
number of reachable nodes on IPv4, however this prevents future libupnpc
vulnerabilities from being a structural risk to the network
(see https://github.com/bitcoin/bitcoin/pull/6795).

Test for LowS signatures before relaying
-----------------------------------------

Make the node require the canonical 'low-s' encoding for ECDSA signatures when
relaying or mining.  This removes a nuisance malleability vector.

Consensus behavior is unchanged.

If widely deployed this change would eliminate the last remaining known vector
for nuisance malleability on SIGHASH_ALL P2PKH transactions. On the down-side
it will block most transactions made by sufficiently out of date software.

Unlike the other avenues to change txids on transactions this
one was randomly violated by all deployed bitcoin software prior to
its discovery. So, while other malleability vectors where made
non-standard as soon as they were discovered, this one has remained
permitted. Even BIP62 did not propose applying this rule to
old version transactions, but conforming implementations have become
much more common since BIP62 was initially written.

Bitcoin Core has produced compatible signatures since a28fb70e in
September 2013, but this didn't make it into a release until 0.9
in March 2014; Bitcoinj has done so for a similar span of time.
Bitcoinjs and electrum have been more recently updated.

This does not replace the need for BIP62 or similar, as miners can
still cooperate to break transactions.  Nor does it replace the
need for wallet software to handle malleability sanely[1]. This
only eliminates the cheap and irritating DOS attack.

[1] On the Malleability of Bitcoin Transactions
Marcin Andrychowicz, Stefan Dziembowski, Daniel Malinowski, Łukasz Mazurek
http://fc15.ifca.ai/preproceedings/bitcoin/paper_9.pdf

Minimum relay fee default increase
-----------------------------------

The default for the `-minrelaytxfee` setting has been increased from `0.00001`
to `0.00005`.

This is necessitated by the current transaction flooding, causing
outrageous memory usage on nodes due to the mempool ballooning. This is a
temporary measure, bridging the time until a dynamic method for determining
this fee is merged (which will be in 0.12).

(see https://github.com/bitcoin/bitcoin/pull/6793, as well as the 0.11
release notes, in which this value was suggested)

0.11.1 Change log
=================

Detailed release notes follow. This overview includes changes that affect
behavior, not code moves, refactors and string updates. For convenience in locating
the code changes and accompanying discussion, both the pull request and
git merge commit are mentioned.

- #6438 `2531438` openssl: avoid config file load/race
- #6439 `980f820` Updated URL location of netinstall for Debian
- #6384 `8e5a969` qt: Force TLS1.0+ for SSL connections
- #6471 `92401c2` Depends: bump to qt 5.5
- #6224 `93b606a` Be even stricter in processing unrequested blocks
- #6571 `100ac4e` libbitcoinconsensus: avoid a crash in multi-threaded environments
- #6545 `649f5d9` Do not store more than 200 timedata samples.
- #6694 `834e299` [QT] fix thin space word wrap line break issue
- #6703 `1cd7952` Backport bugfixes to 0.11
- #6750 `5ed8d0b` Recent rejects backport to v0.11
- #6769 `71cc9d9` Test LowS in standardness, removes nuisance malleability vector.
- #6789 `b4ad73f` Update miniupnpc to 1.9.20151008
- #6785 `b4dc33e` Backport to v0.11: In (strCommand == "tx"), return if AlreadyHave()
- #6412 `0095b9a` Test whether created sockets are select()able
- #6795 `4dbcec0` net: Disable upnp by default
- #6793 `e7bcc4a` Bump minrelaytxfee default

Credits
=======

Thanks to everyone who directly contributed to this release:

- Adam Weiss
- Alex Morcos
- Casey Rodarmor
- Cory Fields
- fanquake
- Gregory Maxwell
- Jonas Schnelli
- J Ross Nicoll
- Luke Dashjr
- Pavel Janík
- Pavel Vasin
- Peter Todd
- Pieter Wuille
- randy-waterhouse
- Ross Nicoll
- Suhas Daftuar
- tailsjoin
- ฿tcDrak
- Tom Harding
- Veres Lajos
- Wladimir J. van der Laan

And those who contributed additional code review and/or security research:

- timothy on IRC for reporting the issue
- Vulnerability in miniupnp discovered by Aleksandar Nikolic of Cisco Talos

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).

Bitcoin Core version 0.11.0 is now available from:

  <https://bitcoin.org/bin/bitcoin-core-0.11.0/>

This is a new major version release, bringing both new features and
bug fixes.

Please report bugs using the issue tracker at github:

  <https://github.com/bitcoin/bitcoin/issues>

Upgrading and downgrading
=========================

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

Downgrade warning
------------------

Because release 0.10.0 and later makes use of headers-first synchronization and
parallel block download (see further), the block files and databases are not
backwards-compatible with pre-0.10 versions of Bitcoin Core or other software:

* Blocks will be stored on disk out of order (in the order they are
received, really), which makes it incompatible with some tools or
other programs. Reindexing using earlier versions will also not work
anymore as a result of this.

* The block index database will now hold headers for which no block is
stored on disk, which earlier versions won't support.

If you want to be able to downgrade smoothly, make a backup of your entire data
directory. Without this your node will need start syncing (or importing from
bootstrap.dat) anew afterwards. It is possible that the data from a completely
synchronised 0.10 node may be usable in older versions as-is, but this is not
supported and may break as soon as the older version attempts to reindex.

This does not affect wallet forward or backward compatibility. There are no
known problems when downgrading from 0.11.x to 0.10.x.

Important information
======================

Transaction flooding
---------------------

At the time of this release, the P2P network is being flooded with low-fee
transactions. This causes a ballooning of the mempool size.

If this growth of the mempool causes problematic memory use on your node, it is
possible to change a few configuration options to work around this. The growth
of the mempool can be monitored with the RPC command `getmempoolinfo`.

One is to increase the minimum transaction relay fee `minrelaytxfee`, which
defaults to 0.00001. This will cause transactions with fewer BTC/kB fee to be
rejected, and thus fewer transactions entering the mempool.

The other is to restrict the relaying of free transactions with
`limitfreerelay`. This option sets the number of kB/minute at which
free transactions (with enough priority) will be accepted. It defaults to 15.
Reducing this number reduces the speed at which the mempool can grow due
to free transactions.

For example, add the following to `bitcoin.conf`:

    minrelaytxfee=0.00005 
    limitfreerelay=5

More robust solutions are being worked on for a follow-up release.

Notable changes
===============

Block file pruning
----------------------

This release supports running a fully validating node without maintaining a copy 
of the raw block and undo data on disk. To recap, there are four types of data 
related to the blockchain in the bitcoin system: the raw blocks as received over 
the network (blk???.dat), the undo data (rev???.dat), the block index and the 
UTXO set (both LevelDB databases). The databases are built from the raw data.

Block pruning allows Bitcoin Core to delete the raw block and undo data once 
it's been validated and used to build the databases. At that point, the raw data 
is used only to relay blocks to other nodes, to handle reorganizations, to look 
up old transactions (if -txindex is enabled or via the RPC/REST interfaces), or 
for rescanning the wallet. The block index continues to hold the metadata about 
all blocks in the blockchain.

The user specifies how much space to allot for block & undo files. The minimum 
allowed is 550MB. Note that this is in addition to whatever is required for the 
block index and UTXO databases. The minimum was chosen so that Bitcoin Core will 
be able to maintain at least 288 blocks on disk (two days worth of blocks at 10 
minutes per block). In rare instances it is possible that the amount of space 
used will exceed the pruning target in order to keep the required last 288 
blocks on disk.

Block pruning works during initial sync in the same way as during steady state, 
by deleting block files "as you go" whenever disk space is allocated. Thus, if 
the user specifies 550MB, once that level is reached the program will begin 
deleting the oldest block and undo files, while continuing to download the 
blockchain.

For now, block pruning disables block relay.  In the future, nodes with block 
pruning will at a minimum relay "new" blocks, meaning blocks that extend their 
active chain. 

Block pruning is currently incompatible with running a wallet due to the fact 
that block data is used for rescanning the wallet and importing keys or 
addresses (which require a rescan.) However, running the wallet with block 
pruning will be supported in the near future, subject to those limitations.

Block pruning is also incompatible with -txindex and will automatically disable 
it.

Once you have pruned blocks, going back to unpruned state requires 
re-downloading the entire blockchain. To do this, re-start the node with 
-reindex. Note also that any problem that would cause a user to reindex (e.g., 
disk corruption) will cause a pruned node to redownload the entire blockchain. 
Finally, note that when a pruned node reindexes, it will delete any blk???.dat 
and rev???.dat files in the data directory prior to restarting the download.

To enable block pruning on the command line:

- `-prune=N`: where N is the number of MB to allot for raw block & undo data.

Modified RPC calls:

- `getblockchaininfo` now includes whether we are in pruned mode or not.
- `getblock` will check if the block's data has been pruned and if so, return an 
error.
- `getrawtransaction` will no longer be able to locate a transaction that has a 
UTXO but where its block file has been pruned. 

Pruning is disabled by default.

Big endian support
--------------------

Experimental support for big-endian CPU architectures was added in this
release. All little-endian specific code was replaced with endian-neutral
constructs. This has been tested on at least MIPS and PPC hosts. The build
system will automatically detect the endianness of the target.

Memory usage optimization
--------------------------

There have been many changes in this release to reduce the default memory usage
of a node, among which:

- Accurate UTXO cache size accounting (#6102); this makes the option `-dbcache`
  precise where this grossly underestimated memory usage before
- Reduce size of per-peer data structure (#6064 and others); this increases the
  number of connections that can be supported with the same amount of memory
- Reduce the number of threads (#5964, #5679); lowers the amount of (esp.
  virtual) memory needed

Fee estimation changes
----------------------

This release improves the algorithm used for fee estimation.  Previously, -1
was returned when there was insufficient data to give an estimate.  Now, -1
will also be returned when there is no fee or priority high enough for the
desired confirmation target. In those cases, it can help to ask for an estimate
for a higher target number of blocks. It is not uncommon for there to be no
fee or priority high enough to be reliably (85%) included in the next block and
for this reason, the default for `-txconfirmtarget=n` has changed from 1 to 2.

Privacy: Disable wallet transaction broadcast
----------------------------------------------

This release adds an option `-walletbroadcast=0` to prevent automatic
transaction broadcast and rebroadcast (#5951). This option allows separating
transaction submission from the node functionality.

Making use of this, third-party scripts can be written to take care of
transaction (re)broadcast:

- Send the transaction as normal, either through RPC or the GUI
- Retrieve the transaction data through RPC using `gettransaction` (NOT
  `getrawtransaction`). The `hex` field of the result will contain the raw
  hexadecimal representation of the transaction
- The transaction can then be broadcasted through arbitrary mechanisms
  supported by the script

One such application is selective Tor usage, where the node runs on the normal
internet but transactions are broadcasted over Tor.

For an example script see [bitcoin-submittx](https://github.com/laanwj/bitcoin-submittx).

Privacy: Stream isolation for Tor
----------------------------------

This release adds functionality to create a new circuit for every peer
connection, when the software is used with Tor. The new option,
`-proxyrandomize`, is on by default.

When enabled, every outgoing connection will (potentially) go through a
different exit node. That significantly reduces the chance to get unlucky and
pick a single exit node that is either malicious, or widely banned from the P2P
network. This improves connection reliability as well as privacy, especially
for the initial connections.

**Important note:** If a non-Tor SOCKS5 proxy is configured that supports
authentication, but doesn't require it, this change may cause that proxy to reject
connections. A user and password is sent where they weren't before. This setup
is exceedingly rare, but in this case `-proxyrandomize=0` can be passed to
disable the behavior.

0.11.0 Change log
=================

Detailed release notes follow. This overview includes changes that affect
behavior, not code moves, refactors and string updates. For convenience in locating
the code changes and accompanying discussion, both the pull request and
git merge commit are mentioned.

### RPC and REST
- #5461 `5f7279a` signrawtransaction: validate private key
- #5444 `103f66b` Add /rest/headers/<count>/<hash>.<ext>
- #4964 `95ecc0a` Add scriptPubKey field to validateaddress RPC call
- #5476 `c986972` Add time offset into getpeerinfo output
- #5540 `84eba47` Add unconfirmed and immature balances to getwalletinfo
- #5599 `40e96a3` Get rid of the internal miner's hashmeter
- #5711 `87ecfb0` Push down RPC locks
- #5754 `1c4e3f9` fix getblocktemplate lock issue
- #5756 `5d901d8` Fix getblocktemplate_proposals test by mining one block
- #5548 `d48ce48` Add /rest/chaininfos
- #5992 `4c4f1b4` Push down RPC reqWallet flag
- #6036 `585b5db` Show zero value txouts in listunspent
- #5199 `6364408` Add RPC call `gettxoutproof` to generate and verify merkle blocks
- #5418 `16341cc` Report missing inputs in sendrawtransaction
- #5937 `40f5e8d` show script verification errors in signrawtransaction result
- #5420 `1fd2d39` getutxos REST command (based on Bip64)
- #6193 `42746b0` [REST] remove json input for getutxos, limit to query max. 15 outpoints
- #6226 `5901596` json: fail read_string if string contains trailing garbage

### Configuration and command-line options
- #5636 `a353ad4` Add option `-allowselfsignedrootcertificate` to allow self signed root certs (for testing payment requests)
- #5900 `3e8a1f2` Add a consistency check `-checkblockindex` for the block chain data structures
- #5951 `7efc9cf` Make it possible to disable wallet transaction broadcast (using `-walletbroadcast=0`)
- #5911 `b6ea3bc` privacy: Stream isolation for Tor (on by default, use `-proxyrandomize=0` to disable)
- #5863 `c271304` Add autoprune functionality (`-prune=<size>`)
- #6153 `0bcf04f` Parameter interaction: disable upnp if -proxy set
- #6274 `4d9c7fe` Add option `-alerts` to opt out of alert system

### Block and transaction handling
- #5367 `dcc1304` Do all block index writes in a batch
- #5253 `203632d` Check against MANDATORY flags prior to accepting to mempool
- #5459 `4406c3e` Reject headers that build on an invalid parent
- #5481 `055f3ae` Apply AreSane() checks to the fees from the network
- #5580 `40d65eb` Preemptively catch a few potential bugs
- #5349 `f55c5e9` Implement test for merkle tree malleability in CPartialMerkleTree
- #5564 `a89b837` clarify obscure uses of EvalScript()
- #5521 `8e4578a` Reject non-final txs even in testnet/regtest
- #5707 `6af674e` Change hardcoded character constants to descriptive named constants for db keys
- #5286 `fcf646c` Change the default maximum OP_RETURN size to 80 bytes
- #5710 `175d86e` Add more information to errors in ReadBlockFromDisk
- #5948 `b36f1ce` Use GetAncestor to compute new target
- #5959 `a0bfc69` Add additional block index consistency checks
- #6058 `7e0e7f8` autoprune minor post-merge improvements
- #5159 `2cc1372` New fee estimation code
- #6102 `6fb90d8` Implement accurate UTXO cache size accounting
- #6129 `2a82298` Bug fix for clearing fCheckForPruning
- #5947 `e9af4e6` Alert if it is very likely we are getting a bad chain
- #6203 `c00ae64` Remove P2SH coinbase flag, no longer interesting
- #5985 `37b4e42` Fix removing of orphan transactions
- #6221 `6cb70ca` Prune: Support noncontiguous block files
- #6256 `fce474c` Use best header chain timestamps to detect partitioning
- #6233 `a587606` Advance pindexLastCommonBlock for blocks in chainActive

### P2P protocol and network code
- #5507 `844ace9` Prevent DOS attacks on in-flight data structures
- #5770 `32a8b6a` Sanitize command strings before logging them
- #5859 `dd4ffce` Add correct bool combiner for net signals
- #5876 `8e4fd0c` Add a NODE_GETUTXO service bit and document NODE_NETWORK
- #6028 `b9311fb` Move nLastTry from CAddress to CAddrInfo
- #5662 `5048465` Change download logic to allow calling getdata on inbound peers
- #5971 `18d2832` replace absolute sleep with conditional wait
- #5918 `7bf5d5e` Use equivalent PoW for non-main-chain requests
- #6059 `f026ab6` chainparams: use SeedSpec6's rather than CAddress's for fixed seeds
- #6080 `31c0bf1` Add jonasschnellis dns seeder
- #5976 `9f7809f` Reduce download timeouts as blocks arrive
- #6172 `b4bbad1` Ignore getheaders requests when not synced
- #5875 `304892f` Be stricter in processing unrequested blocks
- #6333 `41bbc85` Hardcoded seeds update June 2015

### Validation
- #5143 `48e1765` Implement BIP62 rule 6
- #5713 `41e6e4c` Implement BIP66

### Build system
- #5501 `c76c9d2` Add mips, mipsel and aarch64 to depends platforms
- #5334 `cf87536` libbitcoinconsensus: Add pkg-config support
- #5514 `ed11d53` Fix 'make distcheck'
- #5505 `a99ef7d` Build winshutdownmonitor.cpp on Windows only
- #5582 `e8a6639` Osx toolchain update
- #5684 `ab64022` osx: bump build sdk to 10.9
- #5695 `23ef5b7` depends: latest config.guess and config.sub
- #5509 `31dedb4` Fixes when compiling in c++11 mode
- #5819 `f8e68f7` release: use static libstdc++ and disable reduced exports by default
- #5510 `7c3fbc3` Big endian support
- #5149 `c7abfa5` Add script to verify all merge commits are signed
- #6082 `7abbb7e` qt: disable qt tests when one of the checks for the gui fails
- #6244 `0401aa2` configure: Detect (and reject) LibreSSL
- #6269 `95aca44` gitian: Use the new bitcoin-detached-sigs git repo for OSX signatures
- #6285 `ef1d506` Fix scheduler build with some boost versions.
- #6280 `25c2216` depends: fix Boost 1.55 build on GCC 5
- #6303 `b711599` gitian: add a gitian-win-signer descriptor
- #6246 `8ea6d37` Fix build on FreeBSD
- #6282 `daf956b` fix crash on shutdown when e.g. changing -txindex and abort action
- #6354 `bdf0d94` Gitian windows signing normalization

### Wallet
- #2340 `811c71d` Discourage fee sniping with nLockTime
- #5485 `d01bcc4` Enforce minRelayTxFee on wallet created tx and add a maxtxfee option
- #5508 `9a5cabf` Add RandAddSeedPerfmon to MakeNewKey
- #4805 `8204e19` Do not flush the wallet in AddToWalletIfInvolvingMe(..)
- #5319 `93b7544` Clean up wallet encryption code
- #5831 `df5c246` Subtract fee from amount
- #6076 `6c97fd1` wallet: fix boost::get usage with boost 1.58
- #5511 `23c998d` Sort pending wallet transactions before reaccepting
- #6126 `26e08a1` Change default nTxConfirmTarget to 2
- #6183 `75a4d51` Fix off-by-one error w/ nLockTime in the wallet
- #6276 `c9fd907` Fix getbalance * 0

### GUI
- #5219 `f3af0c8` New icons
- #5228 `bb3c75b` HiDPI (retina) support for splash screen
- #5258 `73cbf0a` The RPC Console should be a QWidget to make window more independent
- #5488 `851dfc7` Light blue icon color for regtest
- #5547 `a39aa74` New icon for the debug window
- #5493 `e515309` Adopt style colour for button icons
- #5557 `70477a0` On close of splashscreen interrupt verifyDB
- #5559 `83be8fd` Make the command-line-args dialog better
- #5144 `c5380a9` Elaborate on signverify message dialog warning
- #5489 `d1aa3c6` Optimize PNG files
- #5649 `e0cd2f5` Use text-color icons for system tray Send/Receive menu entries
- #5651 `848f55d` Coin Control: Use U+2248 "ALMOST EQUAL TO" rather than a simple tilde
- #5626 `ab0d798` Fix icon sizes and column width
- #5683 `c7b22aa` add new osx dmg background picture
- #5620 `7823598` Payment request expiration bug fix
- #5729 `9c4a5a5` Allow unit changes for read-only BitcoinAmountField
- #5753 `0f44672` Add bitcoin logo to about screen
- #5629 `a956586` Prevent amount overflow problem with payment requests
- #5830 `215475a` Don't save geometry for options and about/help window
- #5793 `d26f0b2` Honor current network when creating autostart link
- #5847 `f238add` Startup script for centos, with documentation
- #5915 `5bd3a92` Fix a static qt5 crash when using certain versions of libxcb
- #5898 `bb56781` Fix rpc console font size to flexible metrics
- #5467 `bc8535b` Payment request / server work - part 2
- #6161 `180c164` Remove movable option for toolbar
- #6160 `0d862c2` Overviewpage: make sure warning icons gets colored

### Tests
- #5453 `2f2d337` Add ability to run single test manually to RPC tests
- #5421 `886eb57` Test unexecuted OP_CODESEPARATOR
- #5530 `565b300` Additional rpc tests
- #5611 `37b185c` Fix spurious windows test failures after 012598880c
- #5613 `2eda47b` Fix smartfees test for change to relay policy
- #5612 `e3f5727` Fix zapwallettxes test
- #5642 `30a5b5f` Prepare paymentservertests for new unit tests
- #5784 `e3a3cd7` Fix usage of NegateSignatureS in script_tests
- #5813 `ee9f2bf` Add unit tests for next difficulty calculations
- #5855 `d7989c0` Travis: run unit tests in different orders
- #5852 `cdae53e` Reinitialize state in between individual unit tests.
- #5883 `164d7b6` tests: add a BasicTestingSetup and apply to all tests
- #5940 `446bb70` Regression test for ResendWalletTransactions
- #6052 `cf7adad` fix and enable bip32 unit test
- #6039 `734f80a` tests: Error when setgenerate is used on regtest
- #6074 `948beaf` Correct the PUSHDATA4 minimal encoding test in script_invalid.json
- #6032 `e08886d` Stop nodes after RPC tests, even with --nocleanup
- #6075 `df1609f` Add additional script edge condition tests
- #5981 `da38dc6` Python P2P testing 
- #5958 `9ef00c3` Add multisig rpc tests
- #6112 `fec5c0e` Add more script edge condition tests

### Miscellaneous
- #5457, #5506, #5952, #6047 Update libsecp256k1
- #5437 `84857e8` Add missing CAutoFile::IsNull() check in main
- #5490 `ec20fd7` Replace uint256/uint160 with opaque blobs where possible
- #5654, #5764 Adding jonasschnelli's GPG key
- #5477 `5f04d1d` OS X 10.10: LSSharedFileListItemResolve() is deprecated
- #5679 `beff11a` Get rid of DetectShutdownThread
- #5787 `9bd8c9b` Add fanquake PGP key
- #5366 `47a79bb` No longer check osx compatibility in RenameThread
- #5689 `07f4386` openssl: abstract out OPENSSL_cleanse
- #5708 `8b298ca` Add list of implemented BIPs
- #5809 `46bfbe7` Add bitcoin-cli man page
- #5839 `86eb461` keys: remove libsecp256k1 verification until it's actually supported
- #5749 `d734d87` Help messages correctly formatted (79 chars)
- #5884 `7077fe6` BUGFIX: Stack around the variable 'rv' was corrupted
- #5849 `41259ca` contrib/init/bitcoind.openrc: Compatibility with previous OpenRC init script variables
- #5950 `41113e3` Fix locale fallback and guard tests against invalid locale settings
- #5965 `7c6bfb1` Add git-subtree-check.sh script
- #6033 `1623f6e` FreeBSD, OpenBSD thread renaming
- #6064 `b46e7c2` Several changes to mruset
- #6104 `3e2559c` Show an init message while activating best chain
- #6125 `351f73e` Clean up parsing of bool command line args
- #5964 `b4c219b` Lightweight task scheduler
- #6116 `30dc3c1` [OSX] rename Bitcoin-Qt.app to Bitcoin-Core.app
- #6168 `b3024f0` contrib/linearize: Support linearization of testnet blocks
- #6098 `7708fcd` Update Windows resource files (and add one for bitcoin-tx)
- #6159 `e1412d3` Catch errors on datadir lock and pidfile delete
- #6186 `182686c` Fix two problems in CSubnet parsing
- #6174 `df992b9` doc: add translation strings policy
- #6210 `dfdb6dd` build: disable optional use of gmp in internal secp256k1 build
- #6264 `94cd705` Remove translation for -help-debug options
- #6286 `3902c15` Remove berkeley-db4 workaround in MacOSX build docs
- #6319 `3f8fcc9` doc: update mailing list address

Credits
=======

Thanks to everyone who directly contributed to this release:

- 21E14
- Adam Weiss
- Alex Morcos
- ayeowch
- azeteki
- Ben Holden-Crowther
- bikinibabe
- BitcoinPRReadingGroup
- Blake Jakopovic
- BtcDrak
- charlescharles
- Chris Arnesen
- Ciemon
- CohibAA
- Corinne Dashjr
- Cory Fields
- Cozz Lovan
- Daira Hopwood
- Daniel Kraft
- Dave Collins
- David A. Harding
- dexX7
- Earlz
- Eric Lombrozo
- Eric R. Schulz
- Everett Forth
- Flavien Charlon
- fsb4000
- Gavin Andresen
- Gregory Maxwell
- Heath
- Ivan Pustogarov
- Jacob Welsh
- Jameson Lopp
- Jason Lewicki
- Jeff Garzik
- Jonas Schnelli
- Jonathan Brown
- Jorge Timón
- joshr
- jtimon
- Julian Yap
- Luca Venturini
- Luke Dashjr
- Manuel Araoz
- MarcoFalke
- Matt Bogosian
- Matt Corallo
- Micha
- Michael Ford
- Mike Hearn
- mrbandrews
- Nicolas Benoit
- paveljanik
- Pavel Janík
- Pavel Vasin
- Peter Todd
- Philip Kaufmann
- Pieter Wuille
- pstratem
- randy-waterhouse
- rion
- Rob Van Mieghem
- Ross Nicoll
- Ruben de Vries
- sandakersmann
- Shaul Kfir
- Shawn Wilkinson
- sinetek
- Suhas Daftuar
- svost
- Thomas Zander
- Tom Harding
- UdjinM6
- Vitalii Demianets
- Wladimir J. van der Laan

And all those who contributed additional code review and/or security research:

- Sergio Demian Lerner

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).

Bitcoin Core version 0.10.4 is now available from:

  <https://bitcoin.org/bin/bitcoin-core-0.10.4/>

This is a new minor version release, bringing bug fixes, the BIP65
(CLTV) consensus change, and relay policy preparation for BIP113. It is
recommended to upgrade to this version as soon as possible.

Please report bugs using the issue tracker at github:

  <https://github.com/bitcoin/bitcoin/issues>

Upgrading and downgrading
=========================

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

Downgrade warning
------------------

Because release 0.10.0 and later makes use of headers-first synchronization and
parallel block download (see further), the block files and databases are not
backwards-compatible with pre-0.10 versions of Bitcoin Core or other software:

* Blocks will be stored on disk out of order (in the order they are
received, really), which makes it incompatible with some tools or
other programs. Reindexing using earlier versions will also not work
anymore as a result of this.

* The block index database will now hold headers for which no block is
stored on disk, which earlier versions won't support.

If you want to be able to downgrade smoothly, make a backup of your entire data
directory. Without this your node will need start syncing (or importing from
bootstrap.dat) anew afterwards. It is possible that the data from a completely
synchronised 0.10 node may be usable in older versions as-is, but this is not
supported and may break as soon as the older version attempts to reindex.

This does not affect wallet forward or backward compatibility. There are no
known problems when downgrading from 0.11.x to 0.10.x.

Notable changes since 0.10.3
============================

BIP65 soft fork to enforce OP_CHECKLOCKTIMEVERIFY opcode
--------------------------------------------------------

This release includes several changes related to the [BIP65][] soft fork
which redefines the existing OP_NOP2 opcode as OP_CHECKLOCKTIMEVERIFY
(CLTV) so that a transaction output can be made unspendable until a
specified point in the future.

1. This release will only relay and mine transactions spending a CLTV
   output if they comply with the BIP65 rules as provided in code.

2. This release will produce version 4 blocks by default. Please see the
   *notice to miners* below.

3. Once 951 out of a sequence of 1,001 blocks on the local node's best block
   chain contain version 4 (or higher) blocks, this release will no
   longer accept new version 3 blocks and it will only accept version 4
   blocks if they comply with the BIP65 rules for CLTV.

For more information about the soft-forking change, please see
<https://github.com/bitcoin/bitcoin/pull/6351>

Graphs showing the progress towards block version 4 adoption may be
found at the URLs below:

- Block versions over the last 50,000 blocks as progress towards BIP65
  consensus enforcement: <http://bitcoin.sipa.be/ver-50k.png>

- Block versions over the last 2,000 blocks showing the days to the
  earliest possible BIP65 consensus-enforced block: <http://bitcoin.sipa.be/ver-2k.png>

**Notice to miners:** Bitcoin Core’s block templates are now for
version 4 blocks only, and any mining software relying on its
getblocktemplate must be updated in parallel to use libblkmaker either
version FIXME or any version from FIXME onward.

- If you are solo mining, this will affect you the moment you upgrade
  Bitcoin Core, which must be done prior to BIP65 achieving its 951/1001
  status.

- If you are mining with the stratum mining protocol: this does not
  affect you.

- If you are mining with the getblocktemplate protocol to a pool: this
  will affect you at the pool operator’s discretion, which must be no
  later than BIP65 achieving its 951/1001 status.

[BIP65]: https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki

Windows bug fix for corrupted UTXO database on unclean shutdowns
----------------------------------------------------------------

Several Windows users reported that they often need to reindex the
entire blockchain after an unclean shutdown of Bitcoin Core on Windows
(or an unclean shutdown of Windows itself). Although unclean shutdowns
remain unsafe, this release no longer relies on memory-mapped files for
the UTXO database, which significantly reduced the frequency of unclean
shutdowns leading to required reindexes during testing.

For more information, see: <https://github.com/bitcoin/bitcoin/pull/6917>

Other fixes for database corruption on Windows are expected in the
next major release.

0.10.4 Change log
=================

Detailed release notes follow. This overview includes changes that affect
behavior, not code moves, refactors and string updates. For convenience in locating
the code changes and accompanying discussion, both the pull request and
git merge commit are mentioned.

- #6953 `8b3311f` alias -h for --help
- #6953 `97546fc` Change URLs to https in debian/control
- #6953 `38671bf` Update debian/changelog and slight tweak to debian/control
- #6953 `256321e` Correct spelling mistakes in doc folder
- #6953 `eae0350` Clarification of unit test build instructions
- #6953 `90897ab` Update bluematt-key, the old one is long-since revoked
- #6953 `a2f2fb6` build: disable -Wself-assign
- #6953 `cf67d8b` Bugfix: Allow mining on top of old tip blocks for testnet (fixes testnet-in-a-box use case)
- #6953 `b3964e3` Drop "with minimal dependencies" from description
- #6953 `43c2789` Split bitcoin-tx into its own package
- #6953 `dfe0d4d` Include bitcoin-tx binary on Debian/Ubuntu
- #6953 `612efe8` [Qt] Raise debug window when requested
- #6953 `3ad96bd` Fix locking in GetTransaction
- #6953 `9c81005` Fix spelling of Qt
- #6946 `94b67e5` Update LevelDB
- #6706 `5dc72f8` CLTV: Add more tests to improve coverage
- #6706 `6a1343b` Add RPC tests for the CHECKLOCKTIMEVERIFY (BIP65) soft-fork
- #6706 `4137248` Add CHECKLOCKTIMEVERIFY (BIP65) soft-fork logic
- #6706 `0e01d0f` Enable CHECKLOCKTIMEVERIFY as a standard script verify flag
- #6706 `6d01325` Replace NOP2 with CHECKLOCKTIMEVERIFY (BIP65)
- #6706 `750d54f` Move LOCKTIME_THRESHOLD to src/script/script.h
- #6706 `6897468` Make CScriptNum() take nMaxNumSize as an argument
- #6867 `5297194` Set TCP_NODELAY on P2P sockets
- #6836 `fb818b6` Bring historical release notes up to date
- #6852 `0b3fd07` build: make sure OpenSSL heeds noexecstack

Credits
=======

Thanks to everyone who directly contributed to this release:

- Alex Morcos
- Daniel Cousens
- Diego Viola
- Eric Lombrozo
- Esteban Ordano
- Gregory Maxwell
- Luke Dashjr
- MarcoFalke
- Matt Corallo
- Micha
- Mitchell Cash
- Peter Todd
- Pieter Wuille
- Wladimir J. van der Laan
- Zak Wilcox

And those who contributed additional code review and/or security research.

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).
Bitcoin Core version 0.10.3 is now available from:

  <https://bitcoin.org/bin/bitcoin-core-0.10.3/>

This is a new minor version release, bringing security fixes and translation 
updates. It is recommended to upgrade to this version as soon as possible.

Please report bugs using the issue tracker at github:

  <https://github.com/bitcoin/bitcoin/issues>

Upgrading and downgrading
=========================

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

Downgrade warning
------------------

Because release 0.10.0 and later makes use of headers-first synchronization and
parallel block download (see further), the block files and databases are not
backwards-compatible with pre-0.10 versions of Bitcoin Core or other software:

* Blocks will be stored on disk out of order (in the order they are
received, really), which makes it incompatible with some tools or
other programs. Reindexing using earlier versions will also not work
anymore as a result of this.

* The block index database will now hold headers for which no block is
stored on disk, which earlier versions won't support.

If you want to be able to downgrade smoothly, make a backup of your entire data
directory. Without this your node will need start syncing (or importing from
bootstrap.dat) anew afterwards. It is possible that the data from a completely
synchronised 0.10 node may be usable in older versions as-is, but this is not
supported and may break as soon as the older version attempts to reindex.

This does not affect wallet forward or backward compatibility.

Notable changes
===============

Fix buffer overflow in bundled upnp
------------------------------------

Bundled miniupnpc was updated to 1.9.20151008. This fixes a buffer overflow in
the XML parser during initial network discovery.

Details can be found here: http://talosintel.com/reports/TALOS-2015-0035/

This applies to the distributed executables only, not when building from source or
using distribution provided packages.

Additionally, upnp has been disabled by default. This may result in a lower
number of reachable nodes on IPv4, however this prevents future libupnpc
vulnerabilities from being a structural risk to the network
(see https://github.com/bitcoin/bitcoin/pull/6795).

Test for LowS signatures before relaying
-----------------------------------------

Make the node require the canonical 'low-s' encoding for ECDSA signatures when
relaying or mining.  This removes a nuisance malleability vector.

Consensus behavior is unchanged.

If widely deployed this change would eliminate the last remaining known vector
for nuisance malleability on SIGHASH_ALL P2PKH transactions. On the down-side
it will block most transactions made by sufficiently out of date software.

Unlike the other avenues to change txids on transactions this
one was randomly violated by all deployed bitcoin software prior to
its discovery. So, while other malleability vectors where made
non-standard as soon as they were discovered, this one has remained
permitted. Even BIP62 did not propose applying this rule to
old version transactions, but conforming implementations have become
much more common since BIP62 was initially written.

Bitcoin Core has produced compatible signatures since a28fb70e in
September 2013, but this didn't make it into a release until 0.9
in March 2014; Bitcoinj has done so for a similar span of time.
Bitcoinjs and electrum have been more recently updated.

This does not replace the need for BIP62 or similar, as miners can
still cooperate to break transactions.  Nor does it replace the
need for wallet software to handle malleability sanely[1]. This
only eliminates the cheap and irritating DOS attack.

[1] On the Malleability of Bitcoin Transactions
Marcin Andrychowicz, Stefan Dziembowski, Daniel Malinowski, Łukasz Mazurek
http://fc15.ifca.ai/preproceedings/bitcoin/paper_9.pdf

Minimum relay fee default increase
-----------------------------------

The default for the `-minrelaytxfee` setting has been increased from `0.00001`
to `0.00005`.

This is necessitated by the current transaction flooding, causing
outrageous memory usage on nodes due to the mempool ballooning. This is a
temporary measure, bridging the time until a dynamic method for determining
this fee is merged (which will be in 0.12).

(see https://github.com/bitcoin/bitcoin/pull/6793, as well as the 0.11.0
release notes, in which this value was suggested)

0.10.3 Change log
=================

Detailed release notes follow. This overview includes changes that affect external
behavior, not code moves, refactors or string updates.

- #6186 `e4a7d51` Fix two problems in CSubnet parsing
- #6153 `ebd7d8d` Parameter interaction: disable upnp if -proxy set
- #6203 `ecc96f5` Remove P2SH coinbase flag, no longer interesting
- #6226 `181771b` json: fail read_string if string contains trailing garbage
- #6244 `09334e0` configure: Detect (and reject) LibreSSL
- #6276 `0fd8464` Fix getbalance * 0
- #6274 `be64204` Add option `-alerts` to opt out of alert system
- #6319 `3f55638` doc: update mailing list address
- #6438 `7e66e9c` openssl: avoid config file load/race
- #6439 `255eced` Updated URL location of netinstall for Debian
- #6412 `0739e6e` Test whether created sockets are select()able
- #6694 `f696ea1` [QT] fix thin space word wrap line brake issue
- #6704 `743cc9e` Backport bugfixes to 0.10
- #6769 `1cea6b0` Test LowS in standardness, removes nuisance malleability vector.
- #6789 `093d7b5` Update miniupnpc to 1.9.20151008
- #6795 `f2778e0` net: Disable upnp by default
- #6797 `91ef4d9` Do not store more than 200 timedata samples
- #6793 `842c48d` Bump minrelaytxfee default

Credits
=======

Thanks to everyone who directly contributed to this release:

- Adam Weiss
- Alex Morcos
- Casey Rodarmor
- Cory Fields
- fanquake
- Gregory Maxwell
- Jonas Schnelli
- J Ross Nicoll
- Luke Dashjr
- Pavel Vasin
- Pieter Wuille
- randy-waterhouse
- ฿tcDrak
- Tom Harding
- Veres Lajos
- Wladimir J. van der Laan

And all those who contributed additional code review and/or security research:

- timothy on IRC for reporting the issue
- Vulnerability in miniupnp discovered by Aleksandar Nikolic of Cisco Talos

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).
Bitcoin Core version 0.10.2 is now available from:

  <https://bitcoin.org/bin/bitcoin-core-0.10.2/>

This is a new minor version release, bringing minor bug fixes and translation 
updates. It is recommended to upgrade to this version.

Please report bugs using the issue tracker at github:

  <https://github.com/bitcoin/bitcoin/issues>

Upgrading and downgrading
=========================

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

Downgrade warning
------------------

Because release 0.10.0 and later makes use of headers-first synchronization and
parallel block download (see further), the block files and databases are not
backwards-compatible with pre-0.10 versions of Bitcoin Core or other software:

* Blocks will be stored on disk out of order (in the order they are
received, really), which makes it incompatible with some tools or
other programs. Reindexing using earlier versions will also not work
anymore as a result of this.

* The block index database will now hold headers for which no block is
stored on disk, which earlier versions won't support.

If you want to be able to downgrade smoothly, make a backup of your entire data
directory. Without this your node will need start syncing (or importing from
bootstrap.dat) anew afterwards. It is possible that the data from a completely
synchronised 0.10 node may be usable in older versions as-is, but this is not
supported and may break as soon as the older version attempts to reindex.

This does not affect wallet forward or backward compatibility.

Notable changes
===============

This fixes a serious problem on Windows with data directories that have non-ASCII
characters (https://github.com/bitcoin/bitcoin/issues/6078).

For other platforms there are no notable changes.

For the notable changes in 0.10, refer to the release notes
at https://github.com/bitcoin/bitcoin/blob/v0.10.0/doc/release-notes.md

0.10.2 Change log
=================

Detailed release notes follow. This overview includes changes that affect external
behavior, not code moves, refactors or string updates.

Wallet:
- `824c011` fix boost::get usage with boost 1.58

Miscellaneous:
- `da65606` Avoid crash on start in TestBlockValidity with gen=1.
- `424ae66` don't imbue boost::filesystem::path with locale "C" on windows (fixes #6078)

Credits
=======

Thanks to everyone who directly contributed to this release:

- Cory Fields
- Gregory Maxwell
- Jonas Schnelli
- Wladimir J. van der Laan

And all those who contributed additional code review and/or security research:

- dexX7
- Pieter Wuille
- vayvanne

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).
Bitcoin Core version 0.10.1 is now available from:

  <https://bitcoin.org/bin/bitcoin-core-0.10.1/>

This is a new minor version release, bringing bug fixes and translation 
updates. It is recommended to upgrade to this version.

Please report bugs using the issue tracker at github:

  <https://github.com/bitcoin/bitcoin/issues>

Upgrading and downgrading
=========================

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

Downgrade warning
------------------

Because release 0.10.0 and later makes use of headers-first synchronization and
parallel block download (see further), the block files and databases are not
backwards-compatible with pre-0.10 versions of Bitcoin Core or other software:

* Blocks will be stored on disk out of order (in the order they are
received, really), which makes it incompatible with some tools or
other programs. Reindexing using earlier versions will also not work
anymore as a result of this.

* The block index database will now hold headers for which no block is
stored on disk, which earlier versions won't support.

If you want to be able to downgrade smoothly, make a backup of your entire data
directory. Without this your node will need start syncing (or importing from
bootstrap.dat) anew afterwards. It is possible that the data from a completely
synchronised 0.10 node may be usable in older versions as-is, but this is not
supported and may break as soon as the older version attempts to reindex.

This does not affect wallet forward or backward compatibility.

Notable changes
===============

This is a minor release and hence there are no notable changes.
For the notable changes in 0.10, refer to the release notes for the
0.10.0 release at https://github.com/bitcoin/bitcoin/blob/v0.10.0/doc/release-notes.md

0.10.1 Change log
=================

Detailed release notes follow. This overview includes changes that affect external
behavior, not code moves, refactors or string updates.

RPC:
- `7f502be` fix crash: createmultisig and addmultisigaddress
- `eae305f` Fix missing lock in submitblock

Block (database) and transaction handling:
- `1d2cdd2` Fix InvalidateBlock to add chainActive.Tip to setBlockIndexCandidates
- `c91c660` fix InvalidateBlock to repopulate setBlockIndexCandidates
- `002c8a2` fix possible block db breakage during re-index
- `a1f425b` Add (optional) consistency check for the block chain data structures
- `1c62e84` Keep mempool consistent during block-reorgs
- `57d1f46` Fix CheckBlockIndex for reindex
- `bac6fca` Set nSequenceId when a block is fully linked

P2P protocol and network code:
- `78f64ef` don't trickle for whitelisted nodes
- `ca301bf` Reduce fingerprinting through timestamps in 'addr' messages.
- `200f293` Ignore getaddr messages on Outbound connections.
- `d5d8998` Limit message sizes before transfer
- `aeb9279` Better fingerprinting protection for non-main-chain getdatas.
- `cf0218f` Make addrman's bucket placement deterministic (countermeasure 1 against eclipse attacks, see http://cs-people.bu.edu/heilman/eclipse/)
- `0c6f334` Always use a 50% chance to choose between tried and new entries (countermeasure 2 against eclipse attacks)
- `214154e` Do not bias outgoing connections towards fresh addresses (countermeasure 2 against eclipse attacks)
- `aa587d4` Scale up addrman (countermeasure 6 against eclipse attacks)
- `139cd81` Cap nAttempts penalty at 8 and switch to pow instead of a division loop

Validation:
- `d148f62` Acquire CCheckQueue's lock to avoid race condition

Build system:
- `8752b5c` 0.10 fix for crashes on OSX 10.6

Wallet:
- N/A

GUI:
- `2c08406` some mac specifiy cleanup (memory handling, unnecessary code)
- `81145a6` fix OSX dock icon window reopening
- `786cf72` fix a issue where "command line options"-action overwrite "Preference"-action (on OSX)

Tests:
- `1117378` add RPC test for InvalidateBlock

Miscellaneous:
- `c9e022b` Initialization: set Boost path locale in main thread
- `23126a0` Sanitize command strings before logging them.
- `323de27` Initialization: setup environment before starting Qt tests
- `7494e09` Initialization: setup environment before starting tests
- `df45564` Initialization: set fallback locale as environment variable

Credits
=======

Thanks to everyone who directly contributed to this release:

- Alex Morcos
- Cory Fields
- dexX7
- fsb4000
- Gavin Andresen
- Gregory Maxwell
- Ivan Pustogarov
- Jonas Schnelli
- Matt Corallo
- mrbandrews
- Pieter Wuille
- Ruben de Vries
- Suhas Daftuar
- Wladimir J. van der Laan

And all those who contributed additional code review and/or security research:
- 21E14
- Alison Kendler
- Aviv Zohar
- Ethan Heilman
- Evil-Knievel
- fanquake
- Jeff Garzik
- Jonas Nick
- Luke Dashjr
- Patrick Strateman
- Philip Kaufmann
- Sergio Demian Lerner
- Sharon Goldberg

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).
Bitcoin Core version 0.10.0 is now available from:

  https://bitcoin.org/bin/0.10.0/

This is a new major version release, bringing both new features and
bug fixes.

Please report bugs using the issue tracker at github:

  https://github.com/bitcoin/bitcoin/issues

Upgrading and downgrading
=========================

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

Downgrading warning
---------------------

Because release 0.10.0 makes use of headers-first synchronization and parallel
block download (see further), the block files and databases are not
backwards-compatible with older versions of Bitcoin Core or other software:

* Blocks will be stored on disk out of order (in the order they are
received, really), which makes it incompatible with some tools or
other programs. Reindexing using earlier versions will also not work
anymore as a result of this.

* The block index database will now hold headers for which no block is
stored on disk, which earlier versions won't support.

If you want to be able to downgrade smoothly, make a backup of your entire data
directory. Without this your node will need start syncing (or importing from
bootstrap.dat) anew afterwards. It is possible that the data from a completely
synchronised 0.10 node may be usable in older versions as-is, but this is not
supported and may break as soon as the older version attempts to reindex.

This does not affect wallet forward or backward compatibility.


Notable changes
===============

Faster synchronization
----------------------

Bitcoin Core now uses 'headers-first synchronization'. This means that we first
ask peers for block headers (a total of 27 megabytes, as of December 2014) and
validate those. In a second stage, when the headers have been discovered, we
download the blocks. However, as we already know about the whole chain in
advance, the blocks can be downloaded in parallel from all available peers.

In practice, this means a much faster and more robust synchronization. On
recent hardware with a decent network link, it can be as little as 3 hours
for an initial full synchronization. You may notice a slower progress in the
very first few minutes, when headers are still being fetched and verified, but
it should gain speed afterwards.

A few RPCs were added/updated as a result of this:
- `getblockchaininfo` now returns the number of validated headers in addition to
the number of validated blocks.
- `getpeerinfo` lists both the number of blocks and headers we know we have in
common with each peer. While synchronizing, the heights of the blocks that we
have requested from peers (but haven't received yet) are also listed as
'inflight'.
- A new RPC `getchaintips` lists all known branches of the block chain,
including those we only have headers for.

Transaction fee changes
-----------------------

This release automatically estimates how high a transaction fee (or how
high a priority) transactions require to be confirmed quickly. The default
settings will create transactions that confirm quickly; see the new
'txconfirmtarget' setting to control the tradeoff between fees and
confirmation times. Fees are added by default unless the 'sendfreetransactions' 
setting is enabled.

Prior releases used hard-coded fees (and priorities), and would
sometimes create transactions that took a very long time to confirm.

Statistics used to estimate fees and priorities are saved in the
data directory in the `fee_estimates.dat` file just before
program shutdown, and are read in at startup.

New command line options for transaction fee changes:
- `-txconfirmtarget=n` : create transactions that have enough fees (or priority)
so they are likely to begin confirmation within n blocks (default: 1). This setting
is over-ridden by the -paytxfee option.
- `-sendfreetransactions` : Send transactions as zero-fee transactions if possible 
(default: 0)

New RPC commands for fee estimation:
- `estimatefee nblocks` : Returns approximate fee-per-1,000-bytes needed for
a transaction to begin confirmation within nblocks. Returns -1 if not enough
transactions have been observed to compute a good estimate.
- `estimatepriority nblocks` : Returns approximate priority needed for
a zero-fee transaction to begin confirmation within nblocks. Returns -1 if not
enough free transactions have been observed to compute a good
estimate.

RPC access control changes
--------------------------

Subnet matching for the purpose of access control is now done
by matching the binary network address, instead of with string wildcard matching.
For the user this means that `-rpcallowip` takes a subnet specification, which can be

- a single IP address (e.g. `1.2.3.4` or `fe80::0012:3456:789a:bcde`)
- a network/CIDR (e.g. `1.2.3.0/24` or `fe80::0000/64`)
- a network/netmask (e.g. `1.2.3.4/255.255.255.0` or `fe80::0012:3456:789a:bcde/ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff`)

An arbitrary number of `-rpcallow` arguments can be given. An incoming connection will be accepted if its origin address
matches one of them.

For example:

| 0.9.x and before                           | 0.10.x                                |
|--------------------------------------------|---------------------------------------|
| `-rpcallowip=192.168.1.1`                  | `-rpcallowip=192.168.1.1` (unchanged) |
| `-rpcallowip=192.168.1.*`                  | `-rpcallowip=192.168.1.0/24`          |
| `-rpcallowip=192.168.*`                    | `-rpcallowip=192.168.0.0/16`          |
| `-rpcallowip=*` (dangerous!)               | `-rpcallowip=::/0` (still dangerous!) |

Using wildcards will result in the rule being rejected with the following error in debug.log:

    Error: Invalid -rpcallowip subnet specification: *. Valid are a single IP (e.g. 1.2.3.4), a network/netmask (e.g. 1.2.3.4/255.255.255.0) or a network/CIDR (e.g. 1.2.3.4/24).


REST interface
--------------

A new HTTP API is exposed when running with the `-rest` flag, which allows
unauthenticated access to public node data.

It is served on the same port as RPC, but does not need a password, and uses
plain HTTP instead of JSON-RPC.

Assuming a local RPC server running on port 8332, it is possible to request:
- Blocks: http://localhost:8332/rest/block/*HASH*.*EXT*
- Blocks without transactions: http://localhost:8332/rest/block/notxdetails/*HASH*.*EXT*
- Transactions (requires `-txindex`): http://localhost:8332/rest/tx/*HASH*.*EXT*

In every case, *EXT* can be `bin` (for raw binary data), `hex` (for hex-encoded
binary) or `json`.

For more details, see the `doc/REST-interface.md` document in the repository.

RPC Server "Warm-Up" Mode
-------------------------

The RPC server is started earlier now, before most of the expensive
intialisations like loading the block index.  It is available now almost
immediately after starting the process.  However, until all initialisations
are done, it always returns an immediate error with code -28 to all calls.

This new behaviour can be useful for clients to know that a server is already
started and will be available soon (for instance, so that they do not
have to start it themselves).

Improved signing security
-------------------------

For 0.10 the security of signing against unusual attacks has been
improved by making the signatures constant time and deterministic.

This change is a result of switching signing to use libsecp256k1
instead of OpenSSL. Libsecp256k1 is a cryptographic library
optimized for the curve Bitcoin uses which was created by Bitcoin
Core developer Pieter Wuille.

There exist attacks[1] against most ECC implementations where an
attacker on shared virtual machine hardware could extract a private
key if they could cause a target to sign using the same key hundreds
of times. While using shared hosts and reusing keys are inadvisable
for other reasons, it's a better practice to avoid the exposure.

OpenSSL has code in their source repository for derandomization
and reduction in timing leaks that we've eagerly wanted to use for a
long time, but this functionality has still not made its
way into a released version of OpenSSL. Libsecp256k1 achieves
significantly stronger protection: As far as we're aware this is
the only deployed implementation of constant time signing for
the curve Bitcoin uses and we have reason to believe that
libsecp256k1 is better tested and more thoroughly reviewed
than the implementation in OpenSSL.

[1] https://eprint.iacr.org/2014/161.pdf

Watch-only wallet support
-------------------------

The wallet can now track transactions to and from wallets for which you know
all addresses (or scripts), even without the private keys.

This can be used to track payments without needing the private keys online on a
possibly vulnerable system. In addition, it can help for (manual) construction
of multisig transactions where you are only one of the signers.

One new RPC, `importaddress`, is added which functions similarly to
`importprivkey`, but instead takes an address or script (in hexadecimal) as
argument.  After using it, outputs credited to this address or script are
considered to be received, and transactions consuming these outputs will be
considered to be sent.

The following RPCs have optional support for watch-only:
`getbalance`, `listreceivedbyaddress`, `listreceivedbyaccount`,
`listtransactions`, `listaccounts`, `listsinceblock`, `gettransaction`. See the
RPC documentation for those methods for more information.

Compared to using `getrawtransaction`, this mechanism does not require
`-txindex`, scales better, integrates better with the wallet, and is compatible
with future block chain pruning functionality. It does mean that all relevant
addresses need to added to the wallet before the payment, though.

Consensus library
-----------------

Starting from 0.10.0, the Bitcoin Core distribution includes a consensus library.

The purpose of this library is to make the verification functionality that is
critical to Bitcoin's consensus available to other applications, e.g. to language
bindings such as [python-bitcoinlib](https://pypi.python.org/pypi/python-bitcoinlib) or
alternative node implementations.

This library is called `libbitcoinconsensus.so` (or, `.dll` for Windows).
Its interface is defined in the C header [bitcoinconsensus.h](https://github.com/bitcoin/bitcoin/blob/0.10/src/script/bitcoinconsensus.h).

In its initial version the API includes two functions:

- `bitcoinconsensus_verify_script` verifies a script. It returns whether the indicated input of the provided serialized transaction 
correctly spends the passed scriptPubKey under additional constraints indicated by flags
- `bitcoinconsensus_version` returns the API version, currently at an experimental `0`

The functionality is planned to be extended to e.g. UTXO management in upcoming releases, but the interface
for existing methods should remain stable.

Standard script rules relaxed for P2SH addresses
------------------------------------------------

The IsStandard() rules have been almost completely removed for P2SH
redemption scripts, allowing applications to make use of any valid
script type, such as "n-of-m OR y", hash-locked oracle addresses, etc.
While the Bitcoin protocol has always supported these types of script,
actually using them on mainnet has been previously inconvenient as
standard Bitcoin Core nodes wouldn't relay them to miners, nor would
most miners include them in blocks they mined.

bitcoin-tx
----------

It has been observed that many of the RPC functions offered by bitcoind are
"pure functions", and operate independently of the bitcoind wallet. This
included many of the RPC "raw transaction" API functions, such as
createrawtransaction.

bitcoin-tx is a newly introduced command line utility designed to enable easy
manipulation of bitcoin transactions. A summary of its operation may be
obtained via "bitcoin-tx --help" Transactions may be created or signed in a
manner similar to the RPC raw tx API. Transactions may be updated, deleting
inputs or outputs, or appending new inputs and outputs. Custom scripts may be
easily composed using a simple text notation, borrowed from the bitcoin test
suite.

This tool may be used for experimenting with new transaction types, signing
multi-party transactions, and many other uses. Long term, the goal is to
deprecate and remove "pure function" RPC API calls, as those do not require a
server round-trip to execute.

Other utilities "bitcoin-key" and "bitcoin-script" have been proposed, making
key and script operations easily accessible via command line.

Mining and relay policy enhancements
------------------------------------

Bitcoin Core's block templates are now for version 3 blocks only, and any mining
software relying on its `getblocktemplate` must be updated in parallel to use
libblkmaker either version 0.4.2 or any version from 0.5.1 onward.
If you are solo mining, this will affect you the moment you upgrade Bitcoin
Core, which must be done prior to BIP66 achieving its 951/1001 status.
If you are mining with the stratum mining protocol: this does not affect you.
If you are mining with the getblocktemplate protocol to a pool: this will affect
you at the pool operator's discretion, which must be no later than BIP66
achieving its 951/1001 status.

The `prioritisetransaction` RPC method has been added to enable miners to
manipulate the priority of transactions on an individual basis.

Bitcoin Core now supports BIP 22 long polling, so mining software can be
notified immediately of new templates rather than having to poll periodically.

Support for BIP 23 block proposals is now available in Bitcoin Core's
`getblocktemplate` method. This enables miners to check the basic validity of
their next block before expending work on it, reducing risks of accidental
hardforks or mining invalid blocks.

Two new options to control mining policy:
- `-datacarrier=0/1` : Relay and mine "data carrier" (OP_RETURN) transactions
if this is 1.
- `-datacarriersize=n` : Maximum size, in bytes, we consider acceptable for
"data carrier" outputs.

The relay policy has changed to more properly implement the desired behavior of not 
relaying free (or very low fee) transactions unless they have a priority above the 
AllowFreeThreshold(), in which case they are relayed subject to the rate limiter.

BIP 66: strict DER encoding for signatures
------------------------------------------

Bitcoin Core 0.10 implements BIP 66, which introduces block version 3, and a new
consensus rule, which prohibits non-DER signatures. Such transactions have been
non-standard since Bitcoin v0.8.0 (released in February 2013), but were
technically still permitted inside blocks.

This change breaks the dependency on OpenSSL's signature parsing, and is
required if implementations would want to remove all of OpenSSL from the
consensus code.

The same miner-voting mechanism as in BIP 34 is used: when 751 out of a
sequence of 1001 blocks have version number 3 or higher, the new consensus
rule becomes active for those blocks. When 951 out of a sequence of 1001
blocks have version number 3 or higher, it becomes mandatory for all blocks.

Backward compatibility with current mining software is NOT provided, thus miners
should read the first paragraph of "Mining and relay policy enhancements" above.

0.10.0 Change log
=================

Detailed release notes follow. This overview includes changes that affect external
behavior, not code moves, refactors or string updates.

RPC:
- `f923c07` Support IPv6 lookup in bitcoin-cli even when IPv6 only bound on localhost
- `b641c9c` Fix addnode "onetry": Connect with OpenNetworkConnection
- `171ca77` estimatefee / estimatepriority RPC methods
- `b750cf1` Remove cli functionality from bitcoind
- `f6984e8` Add "chain" to getmininginfo, improve help in getblockchaininfo
- `99ddc6c` Add nLocalServices info to RPC getinfo
- `cf0c47b` Remove getwork() RPC call
- `2a72d45` prioritisetransaction <txid> <priority delta> <priority tx fee>
- `e44fea5` Add an option `-datacarrier` to allow users to disable relaying/mining data carrier transactions
- `2ec5a3d` Prevent easy RPC memory exhaustion attack
- `d4640d7` Added argument to getbalance to include watchonly addresses and fixed errors in balance calculation
- `83f3543` Added argument to listaccounts to include watchonly addresses
- `952877e` Showing 'involvesWatchonly' property for transactions returned by 'listtransactions' and 'listsinceblock'. It is only appended when the transaction involves a watchonly address
- `d7d5d23` Added argument to listtransactions and listsinceblock to include watchonly addresses
- `f87ba3d` added includeWatchonly argument to 'gettransaction' because it affects balance calculation
- `0fa2f88` added includedWatchonly argument to listreceivedbyaddress/...account
- `6c37f7f` `getrawchangeaddress`: fail when keypool exhausted and wallet locked
- `ff6a7af` getblocktemplate: longpolling support
- `c4a321f` Add peerid to getpeerinfo to allow correlation with the logs
- `1b4568c` Add vout to ListTransactions output
- `b33bd7a` Implement "getchaintips" RPC command to monitor blockchain forks
- `733177e` Remove size limit in RPC client, keep it in server
- `6b5b7cb` Categorize rpc help overview
- `6f2c26a` Closely track mempool byte total. Add "getmempoolinfo" RPC
- `aa82795` Add detailed network info to getnetworkinfo RPC
- `01094bd` Don't reveal whether password is <20 or >20 characters in RPC
- `57153d4` rpc: Compute number of confirmations of a block from block height
- `ff36cbe` getnetworkinfo: export local node's client sub-version string
- `d14d7de` SanitizeString: allow '(' and ')'
- `31d6390` Fixed setaccount accepting foreign address
- `b5ec5fe` update getnetworkinfo help with subversion
- `ad6e601` RPC additions after headers-first
- `33dfbf5` rpc: Fix leveldb iterator leak, and flush before `gettxoutsetinfo`
- `2aa6329` Enable customising node policy for datacarrier data size with a -datacarriersize option
- `f877aaa` submitblock: Use a temporary CValidationState to determine accurately the outcome of ProcessBlock
- `e69a587` submitblock: Support for returning specific rejection reasons
- `af82884` Add "warmup mode" for RPC server
- `e2655e0` Add unauthenticated HTTP REST interface to public blockchain data
- `683dc40` Disable SSLv3 (in favor of TLS) for the RPC client and server
- `44b4c0d` signrawtransaction: validate private key
- `9765a50` Implement BIP 23 Block Proposal
- `f9de17e` Add warning comment to getinfo

Command-line options:
- `ee21912` Use netmasks instead of wildcards for IP address matching
- `deb3572` Add `-rpcbind` option to allow binding RPC port on a specific interface
- `96b733e` Add `-version` option to get just the version
- `1569353` Add `-stopafterblockimport` option
- `77cbd46` Let -zapwallettxes recover transaction meta data
- `1c750db` remove -tor compatibility code (only allow -onion)
- `4aaa017` rework help messages for fee-related options
- `4278b1d` Clarify error message when invalid -rpcallowip
- `6b407e4` -datadir is now allowed in config files
- `bdd5b58` Add option `-sysperms` to disable 077 umask (create new files with system default umask)
- `cbe39a3` Add "bitcoin-tx" command line utility and supporting modules
- `dbca89b` Trigger -alertnotify if network is upgrading without you
- `ad96e7c` Make -reindex cope with out-of-order blocks
- `16d5194` Skip reindexed blocks individually
- `ec01243` --tracerpc option for regression tests
- `f654f00` Change -genproclimit default to 1
- `3c77714` Make -proxy set all network types, avoiding a connect leak
- `57be955` Remove -printblock, -printblocktree, and -printblockindex
- `ad3d208` remove -maxorphanblocks config parameter since it is no longer functional

Block and transaction handling:
- `7a0e84d` ProcessGetData(): abort if a block file is missing from disk
- `8c93bf4` LoadBlockIndexDB(): Require block db reindex if any `blk*.dat` files are missing
- `77339e5` Get rid of the static chainMostWork (optimization)
- `4e0eed8` Allow ActivateBestChain to release its lock on cs_main
- `18e7216` Push cs_mains down in ProcessBlock
- `fa126ef` Avoid undefined behavior using CFlatData in CScript serialization
- `7f3b4e9` Relax IsStandard rules for pay-to-script-hash transactions
- `c9a0918` Add a skiplist to the CBlockIndex structure
- `bc42503` Use unordered_map for CCoinsViewCache with salted hash (optimization)
- `d4d3fbd` Do not flush the cache after every block outside of IBD (optimization)
- `ad08d0b` Bugfix: make CCoinsViewMemPool support pruned entries in underlying cache
- `5734d4d` Only remove actualy failed blocks from setBlockIndexValid
- `d70bc52` Rework block processing benchmark code
- `714a3e6` Only keep setBlockIndexValid entries that are possible improvements
- `ea100c7` Reduce maximum coinscache size during verification (reduce memory usage)
- `4fad8e6` Reject transactions with excessive numbers of sigops
- `b0875eb` Allow BatchWrite to destroy its input, reducing copying (optimization)
- `92bb6f2` Bypass reloading blocks from disk (optimization)
- `2e28031` Perform CVerifyDB on pcoinsdbview instead of pcoinsTip (reduce memory usage)
- `ab15b2e` Avoid copying undo data (optimization)
- `341735e` Headers-first synchronization
- `afc32c5` Fix rebuild-chainstate feature and improve its performance
- `e11b2ce` Fix large reorgs
- `ed6d1a2` Keep information about all block files in memory
- `a48f2d6` Abstract context-dependent block checking from acceptance
- `7e615f5` Fixed mempool sync after sending a transaction
- `51ce901` Improve chainstate/blockindex disk writing policy
- `a206950` Introduce separate flushing modes
- `9ec75c5` Add a locking mechanism to IsInitialBlockDownload to ensure it never goes from false to true
- `868d041` Remove coinbase-dependant transactions during reorg
- `723d12c` Remove txn which are invalidated by coinbase maturity during reorg
- `0cb8763` Check against MANDATORY flags prior to accepting to mempool
- `8446262` Reject headers that build on an invalid parent
- `008138c` Bugfix: only track UTXO modification after lookup

P2P protocol and network code:
- `f80cffa` Do not trigger a DoS ban if SCRIPT_VERIFY_NULLDUMMY fails
- `c30329a` Add testnet DNS seed of Alex Kotenko
- `45a4baf` Add testnet DNS seed of Andreas Schildbach
- `f1920e8` Ping automatically every 2 minutes (unconditionally)
- `806fd19` Allocate receive buffers in on the fly
- `6ecf3ed` Display unknown commands received
- `aa81564` Track peers' available blocks
- `caf6150` Use async name resolving to improve net thread responsiveness
- `9f4da19` Use pong receive time rather than processing time
- `0127a9b` remove SOCKS4 support from core and GUI, use SOCKS5
- `40f5cb8` Send rejects and apply DoS scoring for errors in direct block validation
- `dc942e6` Introduce whitelisted peers
- `c994d2e` prevent SOCKET leak in BindListenPort()
- `a60120e` Add built-in seeds for .onion
- `60dc8e4` Allow -onlynet=onion to be used
- `3a56de7` addrman: Do not propagate obviously poor addresses onto the network
- `6050ab6` netbase: Make SOCKS5 negotiation interruptible
- `604ee2a` Remove tx from AlreadyAskedFor list once we receive it, not when we process it
- `efad808` Avoid reject message feedback loops
- `71697f9` Separate protocol versioning from clientversion
- `20a5f61` Don't relay alerts to peers before version negotiation
- `b4ee0bd` Introduce preferred download peers
- `845c86d` Do not use third party services for IP detection
- `12a49ca` Limit the number of new addressses to accumulate
- `35e408f` Regard connection failures as attempt for addrman
- `a3a7317` Introduce 10 minute block download timeout
- `3022e7d` Require sufficent priority for relay of free transactions
- `58fda4d` Update seed IPs, based on bitcoin.sipa.be crawler data
- `18021d0` Remove bitnodes.io from dnsseeds.

Validation:
- `6fd7ef2` Also switch the (unused) verification code to low-s instead of even-s
- `584a358` Do merkle root and txid duplicates check simultaneously
- `217a5c9` When transaction outputs exceed inputs, show the offending amounts so as to aid debugging
- `f74fc9b` Print input index when signature validation fails, to aid debugging
- `6fd59ee` script.h: set_vch() should shift a >32 bit value
- `d752ba8` Add SCRIPT_VERIFY_SIGPUSHONLY (BIP62 rule 2) (test only)
- `698c6ab` Add SCRIPT_VERIFY_MINIMALDATA (BIP62 rules 3 and 4) (test only)
- `ab9edbd` script: create sane error return codes for script validation and remove logging
- `219a147` script: check ScriptError values in script tests
- `0391423` Discourage NOPs reserved for soft-fork upgrades
- `98b135f` Make STRICTENC invalid pubkeys fail the script rather than the opcode
- `307f7d4` Report script evaluation failures in log and reject messages
- `ace39db` consensus: guard against openssl's new strict DER checks
- `12b7c44` Improve robustness of DER recoding code
- `76ce5c8` fail immediately on an empty signature

Build system:
- `f25e3ad` Fix build in OS X 10.9
- `65e8ba4` build: Switch to non-recursive make
- `460b32d` build: fix broken boost chrono check on some platforms
- `9ce0774` build: Fix windows configure when using --with-qt-libdir
- `ea96475` build: Add mention of --disable-wallet to bdb48 error messages
- `1dec09b` depends: add shared dependency builder
- `c101c76` build: Add --with-utils (bitcoin-cli and bitcoin-tx, default=yes). Help string consistency tweaks. Target sanity check fix
- `e432a5f` build: add option for reducing exports (v2)
- `6134b43` Fixing condition 'sabotaging' MSVC build
- `af0bd5e` osx: fix signing to make Gatekeeper happy (again)
- `a7d1f03` build: fix dynamic boost check when --with-boost= is used
- `d5fd094` build: fix qt test build when libprotobuf is in a non-standard path
- `2cf5f16` Add libbitcoinconsensus library
- `914868a` build: add a deterministic dmg signer 
- `2d375fe` depends: bump openssl to 1.0.1k
- `b7a4ecc` Build: Only check for boost when building code that requires it

Wallet:
- `b33d1f5` Use fee/priority estimates in wallet CreateTransaction
- `4b7b1bb` Sanity checks for estimates
- `c898846` Add support for watch-only addresses
- `d5087d1` Use script matching rather than destination matching for watch-only
- `d88af56` Fee fixes
- `a35b55b` Dont run full check every time we decrypt wallet
- `3a7c348` Fix make_change to not create half-satoshis
- `f606bb9` fix a possible memory leak in CWalletDB::Recover
- `870da77` fix possible memory leaks in CWallet::EncryptWallet
- `ccca27a` Watch-only fixes
- `9b1627d` [Wallet] Reduce minTxFee for transaction creation to 1000 satoshis
- `a53fd41` Deterministic signing
- `15ad0b5` Apply AreSane() checks to the fees from the network
- `11855c1` Enforce minRelayTxFee on wallet created tx and add a maxtxfee option

GUI:
- `c21c74b` osx: Fix missing dock menu with qt5
- `b90711c` Fix Transaction details shows wrong To:
- `516053c` Make links in 'About Bitcoin Core' clickable
- `bdc83e8` Ensure payment request network matches client network
- `65f78a1` Add GUI view of peer information
- `06a91d9` VerifyDB progress reporting
- `fe6bff2` Add BerkeleyDB version info to RPCConsole
- `b917555` PeerTableModel: Fix potential deadlock. #4296
- `dff0e3b` Improve rpc console history behavior
- `95a9383` Remove CENT-fee-rule from coin control completely
- `56b07d2` Allow setting listen via GUI
- `d95ba75` Log messages with type>QtDebugMsg as non-debug
- `8969828` New status bar Unit Display Control and related changes
- `674c070` seed OpenSSL PNRG with Windows event data
- `509f926` Payment request parsing on startup now only changes network if a valid network name is specified
- `acd432b` Prevent balloon-spam after rescan
- `7007402` Implement SI-style (thin space) thoudands separator
- `91cce17` Use fixed-point arithmetic in amount spinbox
- `bdba2dd` Remove an obscure option no-one cares about
- `bd0aa10` Replace the temporary file hack currently used to change Bitcoin-Qt's dock icon (OS X) with a buffer-based solution
- `94e1b9e` Re-work overviewpage UI
- `8bfdc9a` Better looking trayicon
- `b197bf3` disable tray interactions when client model set to 0
- `1c5f0af` Add column Watch-only to transactions list
- `21f139b` Fix tablet crash. closes #4854
- `e84843c` Broken addresses on command line no longer trigger testnet
- `a49f11d` Change splash screen to normal window
- `1f9be98` Disable App Nap on OSX 10.9+
- `27c3e91` Add proxy to options overridden if necessary
- `4bd1185` Allow "emergency" shutdown during startup
- `d52f072` Don't show wallet options in the preferences menu when running with -disablewallet
- `6093aa1` Qt: QProgressBar CPU-Issue workaround
- `0ed9675` [Wallet] Add global boolean whether to send free transactions (default=true)
- `ed3e5e4` [Wallet] Add global boolean whether to pay at least the custom fee (default=true)
- `e7876b2` [Wallet] Prevent user from paying a non-sense fee
- `c1c9d5b` Add Smartfee to GUI
- `e0a25c5` Make askpassphrase dialog behave more sanely
- `94b362d` On close of splashscreen interrupt verifyDB
- `b790d13` English translation update
- `8543b0d` Correct tooltip on address book page

Tests:
- `b41e594` Fix script test handling of empty scripts
- `d3a33fc` Test CHECKMULTISIG with m == 0 and n == 0
- `29c1749` Let tx (in)valid tests use any SCRIPT_VERIFY flag
- `6380180` Add rejection of non-null CHECKMULTISIG dummy values
- `21bf3d2` Add tests for BoostAsioToCNetAddr
- `b5ad5e7` Add Python test for -rpcbind and -rpcallowip
- `9ec0306` Add CODESEPARATOR/FindAndDelete() tests
- `75ebced` Added many rpc wallet tests
- `0193fb8` Allow multiple regression tests to run at once
- `92a6220` Hook up sanity checks
- `3820e01` Extend and move all crypto tests to crypto_tests.cpp
- `3f9a019` added list/get received by address/ account tests
- `a90689f` Remove timing-based signature cache unit test
- `236982c` Add skiplist unit tests
- `f4b00be` Add CChain::GetLocator() unit test
- `b45a6e8` Add test for getblocktemplate longpolling
- `cdf305e` Set -discover=0 in regtest framework
- `ed02282` additional test for OP_SIZE in script_valid.json
- `0072d98` script tests: BOOLAND, BOOLOR decode to integer
- `833ff16` script tests: values that overflow to 0 are true
- `4cac5db` script tests: value with trailing 0x00 is true
- `89101c6` script test: test case for 5-byte bools
- `d2d9dc0` script tests: add tests for CHECKMULTISIG limits
- `d789386` Add "it works" test for bitcoin-tx
- `df4d61e` Add bitcoin-tx tests
- `aa41ac2` Test IsPushOnly() with invalid push
- `6022b5d` Make `script_{valid,invalid}.json` validation flags configurable
- `8138cbe` Add automatic script test generation, and actual checksig tests
- `ed27e53` Add coins_tests with a large randomized CCoinViewCache test
- `9df9cf5` Make SCRIPT_VERIFY_STRICTENC compatible with BIP62
- `dcb9846` Extend getchaintips RPC test
- `554147a` Ensure MINIMALDATA invalid tests can only fail one way
- `dfeec18` Test every numeric-accepting opcode for correct handling of the numeric minimal encoding rule
- `2b62e17` Clearly separate PUSHDATA and numeric argument MINIMALDATA tests
- `16d78bd` Add valid invert of invalid every numeric opcode tests
- `f635269` tests: enable alertnotify test for Windows
- `7a41614` tests: allow rpc-tests to get filenames for bitcoind and bitcoin-cli from the environment
- `5122ea7` tests: fix forknotify.py on windows
- `fa7f8cd` tests: remove old pull-tester scripts
- `7667850` tests: replace the old (unused since Travis) tests with new rpc test scripts
- `f4e0aef` Do signature-s negation inside the tests
- `1837987` Optimize -regtest setgenerate block generation
- `2db4c8a` Fix node ranges in the test framework
- `a8b2ce5` regression test only setmocktime RPC call
- `daf03e7` RPC tests: create initial chain with specific timestamps
- `8656dbb` Port/fix txnmall.sh regression test
- `ca81587` Test the exact order of CHECKMULTISIG sig/pubkey evaluation
- `7357893` Prioritize and display -testsafemode status in UI
- `f321d6b` Add key generation/verification to ECC sanity check
- `132ea9b` miner_tests: Disable checkpoints so they don't fail the subsidy-change test
- `bc6cb41` QA RPC tests: Add tests block block proposals
- `f67a9ce` Use deterministically generated script tests
- `11d7a7d` [RPC] add rpc-test for http keep-alive (persistent connections)
- `34318d7` RPC-test based on invalidateblock for mempool coinbase spends
- `76ec867` Use actually valid transactions for script tests
- `c8589bf` Add actual signature tests
- `e2677d7` Fix smartfees test for change to relay policy
- `263b65e` tests: run sanity checks in tests too

Miscellaneous:
- `122549f` Fix incorrect checkpoint data for testnet3
- `5bd02cf` Log used config file to debug.log on startup
- `68ba85f` Updated Debian example bitcoin.conf with config from wiki + removed some cruft and updated comments
- `e5ee8f0` Remove -beta suffix
- `38405ac` Add comment regarding experimental-use service bits
- `be873f6` Issue warning if collecting RandSeed data failed
- `8ae973c` Allocate more space if necessary in RandSeedAddPerfMon
- `675bcd5` Correct comment for 15-of-15 p2sh script size
- `fda3fed` libsecp256k1 integration
- `2e36866` Show nodeid instead of addresses in log (for anonymity) unless otherwise requested
- `cd01a5e` Enable paranoid corruption checks in LevelDB >= 1.16
- `9365937` Add comment about never updating nTimeOffset past 199 samples
- `403c1bf` contrib: remove getwork-based pyminer (as getwork API call has been removed)
- `0c3e101` contrib: Added systemd .service file in order to help distributions integrate bitcoind
- `0a0878d` doc: Add new DNSseed policy
- `2887bff` Update coding style and add .clang-format
- `5cbda4f` Changed LevelDB cursors to use scoped pointers to ensure destruction when going out of scope
- `b4a72a7` contrib/linearize: split output files based on new-timestamp-year or max-file-size
- `e982b57` Use explicit fflush() instead of setvbuf()
- `234bfbf` contrib: Add init scripts and docs for Upstart and OpenRC
- `01c2807` Add warning about the merkle-tree algorithm duplicate txid flaw
- `d6712db` Also create pid file in non-daemon mode
- `772ab0e` contrib: use batched JSON-RPC in linarize-hashes (optimization)
- `7ab4358` Update bash-completion for v0.10
- `6e6a36c` contrib: show pull # in prompt for github-merge script
- `5b9f842` Upgrade leveldb to 1.18, make chainstate databases compatible between ARM and x86 (issue #2293)
- `4e7c219` Catch UTXO set read errors and shutdown
- `867c600` Catch LevelDB errors during flush
- `06ca065` Fix CScriptID(const CScript& in) in empty script case

Credits
=======

Thanks to everyone who contributed to this release:

- 21E14
- Adam Weiss
- Aitor Pazos
- Alexander Jeng
- Alex Morcos
- Alon Muroch
- Andreas Schildbach
- Andrew Poelstra
- Andy Alness
- Ashley Holman
- Benedict Chan
- Ben Holden-Crowther
- Bryan Bishop
- BtcDrak
- Christian von Roques
- Clinton Christian
- Cory Fields
- Cozz Lovan
- daniel
- Daniel Kraft
- David Hill
- Derek701
- dexX7
- dllud
- Dominyk Tiller
- Doug
- elichai
- elkingtowa
- ENikS
- Eric Shaw
- Federico Bond
- Francis GASCHET
- Gavin Andresen
- Giuseppe Mazzotta
- Glenn Willen
- Gregory Maxwell
- gubatron
- HarryWu
- himynameismartin
- Huang Le
- Ian Carroll
- imharrywu
- Jameson Lopp
- Janusz Lenar
- JaSK
- Jeff Garzik
- JL2035
- Johnathan Corgan
- Jonas Schnelli
- jtimon
- Julian Haight
- Kamil Domanski
- kazcw
- kevin
- kiwigb
- Kosta Zertsekel
- LongShao007
- Luke Dashjr
- Mark Friedenbach
- Mathy Vanvoorden
- Matt Corallo
- Matthew Bogosian
- Micha
- Michael Ford
- Mike Hearn
- mrbandrews
- mruddy
- ntrgn
- Otto Allmendinger
- paveljanik
- Pavel Vasin
- Peter Todd
- phantomcircuit
- Philip Kaufmann
- Pieter Wuille
- pryds
- randy-waterhouse
- R E Broadley
- Rose Toomey
- Ross Nicoll
- Roy Badami
- Ruben Dario Ponticelli
- Rune K. Svendsen
- Ryan X. Charles
- Saivann
- sandakersmann
- SergioDemianLerner
- shshshsh
- sinetek
- Stuart Cardall
- Suhas Daftuar
- Tawanda Kembo
- Teran McKinney
- tm314159
- Tom Harding
- Trevin Hofmann
- Whit J
- Wladimir J. van der Laan
- Yoichi Hirai
- Zak Wilcox

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).

Bitcoin Core version 0.9.5 is now available from:

  https://bitcoin.org/bin/0.9.5/

This is a new minor version release, with the goal of backporting BIP66. There
are also a few bug fixes and updated translations. Upgrading to this release is
recommended.

Please report bugs using the issue tracker at github:

  https://github.com/bitcoin/bitcoin/issues

How to Upgrade
===============

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

Notable changes
================

Mining and relay policy enhancements
------------------------------------

Bitcoin Core's block templates are now for version 3 blocks only, and any mining
software relying on its `getblocktemplate` must be updated in parallel to use
libblkmaker either version 0.4.2 or any version from 0.5.1 onward.
If you are solo mining, this will affect you the moment you upgrade Bitcoin
Core, which must be done prior to BIP66 achieving its 951/1001 status.
If you are mining with the stratum mining protocol: this does not affect you.
If you are mining with the getblocktemplate protocol to a pool: this will affect
you at the pool operator's discretion, which must be no later than BIP66
achieving its 951/1001 status.

0.9.5 changelog
================

- `74f29c2` Check pindexBestForkBase for null
- `9cd1dd9` Fix priority calculation in CreateTransaction
- `6b4163b` Sanitize command strings before logging them.
- `3230b32` Raise version of created blocks, and enforce DERSIG in mempool
- `989d499` Backport of some of BIP66's tests
- `ab03660` Implement BIP 66 validation rules and switchover logic
- `8438074` build: fix dynamic boost check when --with-boost= is used

Credits
--------

Thanks to who contributed to this release, at least:

- 21E14
- Alex Morcos
- Cory Fields
- Gregory Maxwell
- Pieter Wuille
- Wladimir J. van der Laan

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).
Bitcoin Core version 0.9.4 is now available from:

  https://bitcoin.org/bin/0.9.4/

This is a new minor version release, bringing only bug fixes and updated
translations. Upgrading to this release is recommended.

Please report bugs using the issue tracker at github:

  https://github.com/bitcoin/bitcoin/issues

How to Upgrade
===============

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

OpenSSL Warning
================

OpenSSL 1.0.0p / 1.0.1k was recently released and is being pushed out by
various operating system maintainers. Review by Gregory Maxwell determined that
this update is incompatible with the Bitcoin system and could lead to consensus
forks.

Bitcoin Core released binaries from https://bitcoin.org are unaffected,
as are any built with the gitian deterministic build system.

However, if you are running either

- The Ubuntu PPA from https://launchpad.net/~bitcoin/+archive/ubuntu/bitcoin
- A third-party or self-compiled Bitcoin Core

upgrade to Bitcoin Core 0.9.4, which includes a workaround, **before** updating
OpenSSL.

The incompatibility is due to the OpenSSL update changing the
behavior of ECDSA validation to reject any signature which is
not encoded in a very rigid manner. This was a result of
OpenSSL's change for CVE-2014-8275 "Certificate fingerprints
can be modified".

We are specifically aware of potential hard-forks due to signature
encoding handling and had been hoping to close them via BIP62 in 0.10.
BIP62's purpose is to improve transaction malleability handling and
as a side effect rigidly defines the encoding for signatures, but the
overall scope of BIP62 has made it take longer than we'd like to
deploy.

0.9.4 changelog
================

Validation:
- `b8e81b7` consensus: guard against openssl's new strict DER checks
- `60c51f1` fail immediately on an empty signature
- `037bfef` Improve robustness of DER recoding code

Command-line options:
- `cd5164a` Make -proxy set all network types, avoiding a connect leak.

P2P:
- `bb424e4` Limit the number of new addressses to accumulate

RPC:
- `0a94661` Disable SSLv3 (in favor of TLS) for the RPC client and server.

Build system:
- `f047dfa` gitian: openssl-1.0.1i.tar.gz -> openssl-1.0.1k.tar.gz
- `5b9f78d` build: Fix OSX build when using Homebrew and qt5
- `ffab1dd` Keep symlinks when copying into .app bundle
- `613247f` osx: fix signing to make Gatekeeper happy (again)

Miscellaneous:
- `25b49b5` Refactor -alertnotify code
- `2743529` doc: Add instructions for consistent Mac OS X build names

Credits
--------

Thanks to who contributed to this release, at least:

- Cory Fields
- Gavin Andresen
- Gregory Maxwell
- Jeff Garzik
- Luke Dashjr
- Matt Corallo
- Pieter Wuille
- Saivann
- Sergio Demian Lerner
- Wladimir J. van der Laan

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).
Bitcoin Core version 0.9.3 is now available from:

  https://bitcoin.org/bin/0.9.3/

This is a new minor version release, bringing only bug fixes and updated
translations. Upgrading to this release is recommended.

Please report bugs using the issue tracker at github:

  https://github.com/bitcoin/bitcoin/issues

Upgrading and downgrading
==========================

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

If you are upgrading from version 0.7.2 or earlier, the first time you run
0.9.3 your blockchain files will be re-indexed, which will take anywhere from 
30 minutes to several hours, depending on the speed of your machine.

Downgrading warnings
--------------------

The 'chainstate' for this release is not always compatible with previous
releases, so if you run 0.9.x and then decide to switch back to a
0.8.x release you might get a blockchain validation error when starting the
old release (due to 'pruned outputs' being omitted from the index of
unspent transaction outputs).

Running the old release with the -reindex option will rebuild the chainstate
data structures and correct the problem.

Also, the first time you run a 0.8.x release on a 0.9 wallet it will rescan
the blockchain for missing spent coins, which will take a long time (tens
of minutes on a typical machine).

0.9.3 Release notes
=======================

RPC:
- Avoid a segfault on getblock if it can't read a block from disk
- Add paranoid return value checks in base58

Protocol and network code:
- Don't poll showmyip.com, it doesn't exist anymore
- Add a way to limit deserialized string lengths and use it
- Add a new checkpoint at block 295,000
- Increase IsStandard() scriptSig length
- Avoid querying DNS seeds, if we have open connections
- Remove a useless millisleep in socket handler
- Stricter memory limits on CNode
- Better orphan transaction handling
- Add `-maxorphantx=<n>` and `-maxorphanblocks=<n>` options for control over the maximum orphan transactions and blocks

Wallet:
- Check redeemScript size does not exceed 520 byte limit
- Ignore (and warn about) too-long redeemScripts while loading wallet

GUI:
- fix 'opens in testnet mode when presented with a BIP-72 link with no fallback'
- AvailableCoins: acquire cs_main mutex
- Fix unicode character display on MacOSX

Miscellaneous:
- key.cpp: fail with a friendlier message on missing ssl EC support
- Remove bignum dependency for scripts
- Upgrade OpenSSL to 1.0.1i (see https://www.openssl.org/news/secadv_20140806.txt - just to be sure, no critical issues for Bitcoin Core)
- Upgrade miniupnpc to 1.9.20140701
- Fix boost detection in build system on some platforms

Credits
--------

Thanks to everyone who contributed to this release:

- Andrew Poelstra
- Cory Fields
- Gavin Andresen
- Jeff Garzik
- Johnathan Corgan
- Julian Haight
- Michael Ford
- Pavel Vasin
- Peter Todd
- phantomcircuit
- Pieter Wuille
- Rose Toomey
- Ruben Dario Ponticelli
- shshshsh
- Trevin Hofmann
- Warren Togami
- Wladimir J. van der Laan
- Zak Wilcox

As well as everyone that helped translating on [Transifex](https://www.transifex.com/projects/p/bitcoin/).
Bitcoin Core version 0.9.2 is now available from:

  https://bitcoin.org/bin/0.9.2/

This is a new minor version release, bringing mostly bug fixes and some minor
improvements. OpenSSL has been updated because of a security issue (CVE-2014-0224).
Upgrading to this release is recommended.

Please report bugs using the issue tracker at github:

  https://github.com/bitcoin/bitcoin/issues

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

If you are upgrading from version 0.7.2 or earlier, the first time you run
0.9.2 your blockchain files will be re-indexed, which will take anywhere from 
30 minutes to several hours, depending on the speed of your machine.

Downgrading warnings
--------------------

The 'chainstate' for this release is not always compatible with previous
releases, so if you run 0.9.x and then decide to switch back to a
0.8.x release you might get a blockchain validation error when starting the
old release (due to 'pruned outputs' being omitted from the index of
unspent transaction outputs).

Running the old release with the -reindex option will rebuild the chainstate
data structures and correct the problem.

Also, the first time you run a 0.8.x release on a 0.9 wallet it will rescan
the blockchain for missing spent coins, which will take a long time (tens
of minutes on a typical machine).

Important changes
==================

Gitian OSX build
-----------------

The deterministic build system that was already used for Windows and Linux
builds is now used for OSX as well. Although the resulting executables have
been tested quite a bit, there could be possible regressions. Be sure to report
these on the Github bug tracker mentioned above.

Compatibility of Linux build
-----------------------------

For Linux we now build against Qt 4.6, and filter the symbols for libstdc++ and glibc.
This brings back compatibility with

- Debian 6+ / Tails
- Ubuntu 10.04
- CentOS 6.5

0.9.2 Release notes
=======================

The OpenSSL dependency in the gitian builds has been upgraded to 1.0.1h because of CVE-2014-0224.

RPC:

- Add `getwalletinfo`, `getblockchaininfo` and `getnetworkinfo` calls (will replace hodge-podge `getinfo` at some point)
- Add a `relayfee` field to `getnetworkinfo`
- Fix RPC related shutdown hangs and leaks
- Always show syncnode in `getpeerinfo`
- `sendrawtransaction`: report the reject code and reason, and make it possible to re-send transactions that are already in the mempool
- `getmininginfo` show right genproclimit

Command-line options:

- Fix `-printblocktree` output
- Show error message if ReadConfigFile fails

Block-chain handling and storage:

- Fix for GetBlockValue() after block 13,440,000 (BIP42)
- Upgrade leveldb to 1.17

Protocol and network code:

- Per-peer block download tracking and stalled download detection
- Add new DNS seed from bitnodes.io
- Prevent socket leak in ThreadSocketHandler and correct some proxy related socket leaks
- Use pnode->nLastRecv as sync score (was the wrong way around)

Wallet:

- Make GetAvailableCredit run GetHash() only once per transaction (performance improvement)
- Lower paytxfee warning threshold from 0.25 BTC to 0.01 BTC
- Fix importwallet nTimeFirstKey (trigger necessary rescans)
- Log BerkeleyDB version at startup
- CWallet init fix

Build system:

- Add OSX build descriptors to gitian
- Fix explicit --disable-qt-dbus
- Don't require db_cxx.h when compiling with wallet disabled and GUI enabled
- Improve missing boost error reporting
- Upgrade miniupnpc version to 1.9
- gitian-linux: --enable-glibc-back-compat for binary compatibility with old distributions
- gitian: don't export any symbols from executable
- gitian: build against Qt 4.6
- devtools: add script to check symbols from Linux gitian executables
- Remove build-time no-IPv6 setting

GUI:

- Fix various coin control visual issues
- Show number of in/out connections in debug console
- Show weeks as well as years behind for long timespans behind
- Enable and disable the Show and Remove buttons for requested payments history based on whether any entry is selected.
- Show also value for options overridden on command line in options dialog
- Fill in label from address book also for URIs
- Fixes feel when resizing the last column on tables (issue #2862)
- Fix ESC in disablewallet mode
- Add expert section to wallet tab in optionsdialog
- Do proper boost::path conversion (fixes unicode in datadir)
- Only override -datadir if different from the default (fixes -datadir in config file)
- Show rescan progress at start-up
- Show importwallet progress
- Get required locks upfront in polling functions (avoids hanging on locks)
- Catch Windows shutdown events while client is running
- Optionally add third party links to transaction context menu
- Check for !pixmap() before trying to export QR code (avoids crashes when no QR code could be generated)
- Fix "Start bitcoin on system login"

Miscellaneous:

- Replace non-threadsafe C functions (gmtime, strerror and setlocale)
- Add missing cs_main and wallet locks
- Avoid exception at startup when system locale not recognized
- Changed bitrpc.py's raw_input to getpass for passwords to conceal characters during command line input
- devtools: add a script to fetch and postprocess translations

Credits
--------

Thanks to everyone who contributed to this release:

- Addy Yeow
- Altoidnerd
- Andrea D'Amore
- Andreas Schildbach
- Bardi Harborow
- Brandon Dahler
- Bryan Bishop
- Chris Beams
- Christian von Roques
- Cory Fields
- Cozz Lovan
- daniel
- Daniel Newton
- David A. Harding
- ditto-b
- duanemoody
- Eric S. Bullington
- Fabian Raetz
- Gavin Andresen
- Gregory Maxwell
- gubatron
- Haakon Nilsen
- harry
- Hector Jusforgues
- Isidoro Ghezzi
- Jeff Garzik
- Johnathan Corgan
- jtimon
- Kamil Domanski
- langerhans
- Luke Dashjr
- Manuel Araoz
- Mark Friedenbach
- Matt Corallo
- Matthew Bogosian
- Meeh
- Michael Ford
- Michagogo
- Mikael Wikman
- Mike Hearn
- olalonde
- paveljanik
- peryaudo
- Philip Kaufmann
- philsong
- Pieter Wuille
- R E Broadley
- richierichrawr
- Rune K. Svendsen
- rxl
- shshshsh
- Simon de la Rouviere
- Stuart Cardall
- super3
- Telepatheic
- Thomas Zander
- Torstein Husebø
- Warren Togami
- Wladimir J. van der Laan
- Yoichi Hirai
Bitcoin Core version 0.9.2.1 is now available from:

  https://bitcoin.org/bin/0.9.2.1/

This is a new minor version release, bringing mostly bug fixes and some minor
improvements. OpenSSL has been updated because of a security issue (CVE-2014-0224).
Upgrading to this release is recommended.

Please report bugs using the issue tracker at github:

  https://github.com/bitcoin/bitcoin/issues

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

If you are upgrading from version 0.7.2 or earlier, the first time you run
0.9.2.1 your blockchain files will be re-indexed, which will take anywhere from 
30 minutes to several hours, depending on the speed of your machine.

Downgrading warnings
--------------------

The 'chainstate' for this release is not always compatible with previous
releases, so if you run 0.9.x and then decide to switch back to a
0.8.x release you might get a blockchain validation error when starting the
old release (due to 'pruned outputs' being omitted from the index of
unspent transaction outputs).

Running the old release with the -reindex option will rebuild the chainstate
data structures and correct the problem.

Also, the first time you run a 0.8.x release on a 0.9 wallet it will rescan
the blockchain for missing spent coins, which will take a long time (tens
of minutes on a typical machine).

Important changes
==================

Gitian OSX build
-----------------

The deterministic build system that was already used for Windows and Linux
builds is now used for OSX as well. Although the resulting executables have
been tested quite a bit, there could be possible regressions. Be sure to report
these on the Github bug tracker mentioned above.

Compatibility of Linux build
-----------------------------

For Linux we now build against Qt 4.6, and filter the symbols for libstdc++ and glibc.
This brings back compatibility with

- Debian 6+ / Tails
- Ubuntu 10.04
- CentOS 6.5

0.9.2 - 0.9.2.1 Release notes
=======================

The OpenSSL dependency in the gitian builds has been upgraded to 1.0.1h because of CVE-2014-0224.

RPC:

- Add `getwalletinfo`, `getblockchaininfo` and `getnetworkinfo` calls (will replace hodge-podge `getinfo` at some point)
- Add a `relayfee` field to `getnetworkinfo`
- Fix RPC related shutdown hangs and leaks
- Always show syncnode in `getpeerinfo`
- `sendrawtransaction`: report the reject code and reason, and make it possible to re-send transactions that are already in the mempool
- `getmininginfo` show right genproclimit

Command-line options:

- Fix `-printblocktree` output
- Show error message if ReadConfigFile fails

Block-chain handling and storage:

- Fix for GetBlockValue() after block 13,440,000 (BIP42)
- Upgrade leveldb to 1.17

Protocol and network code:

- Per-peer block download tracking and stalled download detection
- Add new DNS seed from bitnodes.io
- Prevent socket leak in ThreadSocketHandler and correct some proxy related socket leaks
- Use pnode->nLastRecv as sync score (was the wrong way around)

Wallet:

- Make GetAvailableCredit run GetHash() only once per transaction (performance improvement)
- Lower paytxfee warning threshold from 0.25 BTC to 0.01 BTC
- Fix importwallet nTimeFirstKey (trigger necessary rescans)
- Log BerkeleyDB version at startup
- CWallet init fix

Build system:

- Add OSX build descriptors to gitian
- Fix explicit --disable-qt-dbus
- Don't require db_cxx.h when compiling with wallet disabled and GUI enabled
- Improve missing boost error reporting
- Upgrade miniupnpc version to 1.9
- gitian-linux: --enable-glibc-back-compat for binary compatibility with old distributions
- gitian: don't export any symbols from executable
- gitian: build against Qt 4.6
- devtools: add script to check symbols from Linux gitian executables
- Remove build-time no-IPv6 setting

GUI:

- Fix various coin control visual issues
- Show number of in/out connections in debug console
- Show weeks as well as years behind for long timespans behind
- Enable and disable the Show and Remove buttons for requested payments history based on whether any entry is selected.
- Show also value for options overridden on command line in options dialog
- Fill in label from address book also for URIs
- Fixes feel when resizing the last column on tables (issue #2862)
- Fix ESC in disablewallet mode
- Add expert section to wallet tab in optionsdialog
- Do proper boost::path conversion (fixes unicode in datadir)
- Only override -datadir if different from the default (fixes -datadir in config file)
- Show rescan progress at start-up
- Show importwallet progress
- Get required locks upfront in polling functions (avoids hanging on locks)
- Catch Windows shutdown events while client is running
- Optionally add third party links to transaction context menu
- Check for !pixmap() before trying to export QR code (avoids crashes when no QR code could be generated)
- Fix "Start bitcoin on system login"

Miscellaneous:

- Replace non-threadsafe C functions (gmtime, strerror and setlocale)
- Add missing cs_main and wallet locks
- Avoid exception at startup when system locale not recognized
- Changed bitrpc.py's raw_input to getpass for passwords to conceal characters during command line input
- devtools: add a script to fetch and postprocess translations

Credits
--------

Thanks to everyone who contributed to this release:

- Addy Yeow
- Altoidnerd
- Andrea D'Amore
- Andreas Schildbach
- Bardi Harborow
- Brandon Dahler
- Bryan Bishop
- Chris Beams
- Christian von Roques
- Cory Fields
- Cozz Lovan
- daniel
- Daniel Newton
- David A. Harding
- ditto-b
- duanemoody
- Eric S. Bullington
- Fabian Raetz
- Gavin Andresen
- Gregory Maxwell
- gubatron
- Haakon Nilsen
- harry
- Hector Jusforgues
- Isidoro Ghezzi
- Jeff Garzik
- Johnathan Corgan
- jtimon
- Kamil Domanski
- langerhans
- Luke Dashjr
- Manuel Araoz
- Mark Friedenbach
- Matt Corallo
- Matthew Bogosian
- Meeh
- Michael Ford
- Michagogo
- Mikael Wikman
- Mike Hearn
- olalonde
- paveljanik
- peryaudo
- Philip Kaufmann
- philsong
- Pieter Wuille
- R E Broadley
- richierichrawr
- Rune K. Svendsen
- rxl
- shshshsh
- Simon de la Rouviere
- Stuart Cardall
- super3
- Telepatheic
- Thomas Zander
- Torstein Husebø
- Warren Togami
- Wladimir J. van der Laan
- Yoichi Hirai
Bitcoin Core version 0.9.1 is now available from:

  https://bitcoin.org/bin/0.9.1/

This is a security update. It is recommended to upgrade to this release
as soon as possible.

It is especially important to upgrade if you currently have version
0.9.0 installed and are using the graphical interface OR you are using
bitcoind from any pre-0.9.1 version, and have enabled SSL for RPC and
have configured allowip to allow rpc connections from potentially
hostile hosts.

Please report bugs using the issue tracker at github:

  https://github.com/bitcoin/bitcoin/issues

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), then run the
installer (on Windows) or just copy over /Applications/Bitcoin-Qt (on Mac) or
bitcoind/bitcoin-qt (on Linux).

If you are upgrading from version 0.7.2 or earlier, the first time you run
0.9.1 your blockchain files will be re-indexed, which will take anywhere from 
30 minutes to several hours, depending on the speed of your machine.

0.9.1 Release notes
=======================

No code changes were made between 0.9.0 and 0.9.1. Only the dependencies were changed.

- Upgrade OpenSSL to 1.0.1g. This release fixes the following vulnerabilities which can
  affect the Bitcoin Core software:

  - CVE-2014-0160 ("heartbleed")
    A missing bounds check in the handling of the TLS heartbeat extension can
    be used to reveal up to 64k of memory to a connected client or server.

  - CVE-2014-0076
    The Montgomery ladder implementation in OpenSSL does not ensure that
    certain swap operations have a constant-time behavior, which makes it
    easier for local users to obtain ECDSA nonces via a FLUSH+RELOAD cache
    side-channel attack.

- Add statically built executables to Linux build

Credits
--------

Credits go to the OpenSSL team for fixing the vulnerabilities quickly.
Bitcoin Core version 0.9.0 is now available from:

  https://bitcoin.org/bin/0.9.0/

This is a new major version release, bringing both new features and
bug fixes.

Please report bugs using the issue tracker at github:

  https://github.com/bitcoin/bitcoin/issues

How to Upgrade
--------------

If you are running an older version, shut it down. Wait until it has completely
shut down (which might take a few minutes for older versions), uninstall all
earlier versions of Bitcoin, then run the installer (on Windows) or just copy
over /Applications/Bitcoin-Qt (on Mac) or bitcoind/bitcoin-qt (on Linux).

If you are upgrading from version 0.7.2 or earlier, the first time you run
0.9.0 your blockchain files will be re-indexed, which will take anywhere from 
30 minutes to several hours, depending on the speed of your machine.

On Windows, do not forget to uninstall all earlier versions of the Bitcoin
client first, especially if you are switching to the 64-bit version.

Windows 64-bit installer
-------------------------

New in 0.9.0 is the Windows 64-bit version of the client. There have been
frequent reports of users running out of virtual memory on 32-bit systems
during the initial sync. Because of this it is recommended to install the
64-bit version if your system supports it.

NOTE: Release candidate 2 Windows binaries are not code-signed; use PGP
and the SHA256SUMS.asc file to make sure your binaries are correct.
In the final 0.9.0 release, Windows setup.exe binaries will be code-signed.

OSX 10.5 / 32-bit no longer supported
-------------------------------------

0.9.0 drops support for older Macs. The minimum requirements are now:
* A 64-bit-capable CPU (see http://support.apple.com/kb/ht3696);
* Mac OS 10.6 or later (see https://support.apple.com/kb/ht1633).

Downgrading warnings
--------------------

The 'chainstate' for this release is not always compatible with previous
releases, so if you run 0.9 and then decide to switch back to a
0.8.x release you might get a blockchain validation error when starting the
old release (due to 'pruned outputs' being omitted from the index of
unspent transaction outputs).

Running the old release with the -reindex option will rebuild the chainstate
data structures and correct the problem.

Also, the first time you run a 0.8.x release on a 0.9 wallet it will rescan
the blockchain for missing spent coins, which will take a long time (tens
of minutes on a typical machine).

Rebranding to Bitcoin Core
---------------------------

To reduce confusion between Bitcoin-the-network and Bitcoin-the-software we
have renamed the reference client to Bitcoin Core.


OP_RETURN and data in the block chain
-------------------------------------
On OP_RETURN:  There was been some confusion and misunderstanding in
the community, regarding the OP_RETURN feature in 0.9 and data in the
blockchain.  This change is not an endorsement of storing data in the
blockchain.  The OP_RETURN change creates a provably-prunable output,
to avoid data storage schemes -- some of which were already deployed --
that were storing arbitrary data such as images as forever-unspendable
TX outputs, bloating bitcoin's UTXO database.

Storing arbitrary data in the blockchain is still a bad idea; it is less
costly and far more efficient to store non-currency data elsewhere.

Autotools build system
-----------------------

For 0.9.0 we switched to an autotools-based build system instead of individual
(q)makefiles.

Using the standard "./autogen.sh; ./configure; make" to build Bitcoin-Qt and
bitcoind makes it easier for experienced open source developers to contribute 
to the project.

Be sure to check doc/build-*.md for your platform before building from source.

Bitcoin-cli
-------------

Another change in the 0.9 release is moving away from the bitcoind executable
functioning both as a server and as a RPC client. The RPC client functionality
("tell the running bitcoin daemon to do THIS") was split into a separate
executable, 'bitcoin-cli'. The RPC client code will eventually be removed from
bitcoind, but will be kept for backwards compatibility for a release or two.

`walletpassphrase` RPC
-----------------------

The behavior of the `walletpassphrase` RPC when the wallet is already unlocked
has changed between 0.8 and 0.9.

The 0.8 behavior of `walletpassphrase` is to fail when the wallet is already unlocked:

    > walletpassphrase 1000
    walletunlocktime = now + 1000
    > walletpassphrase 10
    Error: Wallet is already unlocked (old unlock time stays)

The new behavior of `walletpassphrase` is to set a new unlock time overriding
the old one:

    > walletpassphrase 1000
    walletunlocktime = now + 1000
    > walletpassphrase 10
    walletunlocktime = now + 10 (overriding the old unlock time)

Transaction malleability-related fixes
--------------------------------------

This release contains a few fixes for transaction ID (TXID) malleability 
issues:

- -nospendzeroconfchange command-line option, to avoid spending
  zero-confirmation change
- IsStandard() transaction rules tightened to prevent relaying and mining of
  mutated transactions
- Additional information in listtransactions/gettransaction output to
  report wallet transactions that conflict with each other because
  they spend the same outputs.
- Bug fixes to the getbalance/listaccounts RPC commands, which would report
  incorrect balances for double-spent (or mutated) transactions.
- New option: -zapwallettxes to rebuild the wallet's transaction information

Transaction Fees
----------------

This release drops the default fee required to relay transactions across the
network and for miners to consider the transaction in their blocks to
0.01mBTC per kilobyte.

Note that getting a transaction relayed across the network does NOT guarantee
that the transaction will be accepted by a miner; by default, miners fill
their blocks with 50 kilobytes of high-priority transactions, and then with
700 kilobytes of the highest-fee-per-kilobyte transactions.

The minimum relay/mining fee-per-kilobyte may be changed with the
minrelaytxfee option. Note that previous releases incorrectly used
the mintxfee setting to determine which low-priority transactions should
be considered for inclusion in blocks.

The wallet code still uses a default fee for low-priority transactions of
0.1mBTC per kilobyte. During periods of heavy transaction volume, even this
fee may not be enough to get transactions confirmed quickly; the mintxfee
option may be used to override the default.

0.9.0 Release notes
=======================

RPC:

- New notion of 'conflicted' transactions, reported as confirmations: -1
- 'listreceivedbyaddress' now provides tx ids
- Add raw transaction hex to 'gettransaction' output
- Updated help and tests for 'getreceivedby(account|address)'
- In 'getblock', accept 2nd 'verbose' parameter, similar to getrawtransaction,
  but defaulting to 1 for backward compatibility
- Add 'verifychain', to verify chain database at runtime
- Add 'dumpwallet' and 'importwallet' RPCs
- 'keypoolrefill' gains optional size parameter
- Add 'getbestblockhash', to return tip of best chain
- Add 'chainwork' (the total work done by all blocks since the genesis block)
  to 'getblock' output
- Make RPC password resistant to timing attacks
- Clarify help messages and add examples
- Add 'getrawchangeaddress' call for raw transaction change destinations
- Reject insanely high fees by default in 'sendrawtransaction'
- Add RPC call 'decodescript' to decode a hex-encoded transaction script
- Make 'validateaddress' provide redeemScript
- Add 'getnetworkhashps' to get the calculated network hashrate
- New RPC 'ping' command to request ping, new 'pingtime' and 'pingwait' fields
  in 'getpeerinfo' output
- Adding new 'addrlocal' field to 'getpeerinfo' output
- Add verbose boolean to 'getrawmempool'
- Add rpc command 'getunconfirmedbalance' to obtain total unconfirmed balance
- Explicitly ensure that wallet is unlocked in `importprivkey`
- Add check for valid keys in `importprivkey`

Command-line options:

- New option: -nospendzeroconfchange to never spend unconfirmed change outputs
- New option: -zapwallettxes to rebuild the wallet's transaction information
- Rename option '-tor' to '-onion' to better reflect what it does
- Add '-disablewallet' mode to let bitcoind run entirely without wallet (when
  built with wallet)
- Update default '-rpcsslciphers' to include TLSv1.2
- make '-logtimestamps' default on and rework help-message
- RPC client option: '-rpcwait', to wait for server start
- Remove '-logtodebugger'
- Allow `-noserver` with bitcoind

Block-chain handling and storage:

- Update leveldb to 1.15
- Check for correct genesis (prevent cases where a datadir from the wrong
  network is accidentally loaded)
- Allow txindex to be removed and add a reindex dialog
- Log aborted block database rebuilds
- Store orphan blocks in serialized form, to save memory
- Limit the number of orphan blocks in memory to 750
- Fix non-standard disconnected transactions causing mempool orphans
- Add a new checkpoint at block 279,000

Wallet:

- Bug fixes and new regression tests to correctly compute
  the balance of wallets containing double-spent (or mutated) transactions
- Store key creation time. Calculate whole-wallet birthday.
- Optimize rescan to skip blocks prior to birthday
- Let user select wallet file with -wallet=foo.dat
- Consider generated coins mature at 101 instead of 120 blocks
- Improve wallet load time
- Don't count txins for priority to encourage sweeping
- Don't create empty transactions when reading a corrupted wallet
- Fix rescan to start from beginning after importprivkey
- Only create signatures with low S values

Mining:

- Increase default -blockmaxsize/prioritysize to 750K/50K
- 'getblocktemplate' does not require a key to create a block template
- Mining code fee policy now matches relay fee policy

Protocol and network:

- Drop the fee required to relay a transaction to 0.01mBTC per kilobyte
- Send tx relay flag with version
- New 'reject' P2P message (BIP 0061, see
  https://gist.github.com/gavinandresen/7079034 for draft)
- Dump addresses every 15 minutes instead of 10 seconds
- Relay OP_RETURN data TxOut as standard transaction type
- Remove CENT-output free transaction rule when relaying
- Lower maximum size for free transaction creation
- Send multiple inv messages if mempool.size > MAX_INV_SZ
- Split MIN_PROTO_VERSION into INIT_PROTO_VERSION and MIN_PEER_PROTO_VERSION
- Do not treat fFromMe transaction differently when broadcasting
- Process received messages one at a time without sleeping between messages
- Improve logging of failed connections
- Bump protocol version to 70002
- Add some additional logging to give extra network insight
- Added new DNS seed from bitcoinstats.com

Validation:

- Log reason for non-standard transaction rejection
- Prune provably-unspendable outputs, and adapt consistency check for it.
- Detect any sufficiently long fork and add a warning
- Call the -alertnotify script when we see a long or invalid fork
- Fix multi-block reorg transaction resurrection
- Reject non-canonically-encoded serialization sizes
- Reject dust amounts during validation
- Accept nLockTime transactions that finalize in the next block

Build system:

- Switch to autotools-based build system
- Build without wallet by passing `--disable-wallet` to configure, this 
  removes the BerkeleyDB dependency
- Upgrade gitian dependencies (libpng, libz, libupnpc, boost, openssl) to more
  recent versions
- Windows 64-bit build support
- Solaris compatibility fixes
- Check integrity of gitian input source tarballs
- Enable full GCC Stack-smashing protection for all OSes

GUI:

- Switch to Qt 5.2.0 for Windows build
- Add payment request (BIP 0070) support
- Improve options dialog
- Show transaction fee in new send confirmation dialog
- Add total balance in overview page
- Allow user to choose data directory on first start, when data directory is
  missing, or when the -choosedatadir option is passed
- Save and restore window positions
- Add vout index to transaction id in transactions details dialog
- Add network traffic graph in debug window
- Add open URI dialog
- Add Coin Control Features
- Improve receive coins workflow: make the 'Receive' tab into a form to request
  payments, and move historical address list functionality to File menu.
- Rebrand to `Bitcoin Core`
- Move initialization/shutdown to a thread. This prevents "Not responding"
  messages during startup. Also show a window during shutdown.
- Don't regenerate autostart link on every client startup
- Show and store message of normal bitcoin:URI
- Fix richtext detection hang issue on very old Qt versions
- OS X: Make use of the 10.8+ user notification center to display Growl-like 
  notifications
- OS X: Added NSHighResolutionCapable flag to Info.plist for better font
  rendering on Retina displays.
- OS X: Fix bitcoin-qt startup crash when clicking dock icon
- Linux: Fix Gnome bitcoin: URI handler

Miscellaneous:

- Add Linux script (contrib/qos/tc.sh) to limit outgoing bandwidth
- Add '-regtest' mode, similar to testnet but private with instant block
  generation with 'setgenerate' RPC.
- Add 'linearize.py' script to contrib, for creating bootstrap.dat
- Add separate bitcoin-cli client

Credits
--------

Thanks to everyone who contributed to this release:

- Andrey
- Ashley Holman
- b6393ce9-d324-4fe1-996b-acf82dbc3d53
- bitsofproof
- Brandon Dahler
- Calvin Tam
- Christian Decker
- Christian von Roques
- Christopher Latham
- Chuck
- coblee
- constantined
- Cory Fields
- Cozz Lovan
- daniel
- Daniel Larimer
- David Hill
- Dmitry Smirnov
- Drak
- Eric Lombrozo
- fanquake
- fcicq
- Florin
- frewil
- Gavin Andresen
- Gregory Maxwell
- gubatron
- Guillermo Céspedes Tabárez
- Haakon Nilsen
- HaltingState
- Han Lin Yap
- harry
- Ian Kelling
- Jeff Garzik
- Johnathan Corgan
- Jonas Schnelli
- Josh Lehan
- Josh Triplett
- Julian Langschaedel
- Kangmo
- Lake Denman
- Luke Dashjr
- Mark Friedenbach
- Matt Corallo
- Michael Bauer
- Michael Ford
- Michagogo
- Midnight Magic
- Mike Hearn
- Nils Schneider
- Noel Tiernan
- Olivier Langlois
- patrick s
- Patrick Strateman
- paveljanik
- Peter Todd
- phantomcircuit
- phelixbtc
- Philip Kaufmann
- Pieter Wuille
- Rav3nPL
- R E Broadley
- regergregregerrge
- Robert Backhaus
- Roman Mindalev
- Rune K. Svendsen
- Ryan Niebur
- Scott Ellis
- Scott Willeke
- Sergey Kazenyuk
- Shawn Wilkinson
- Sined
- sje
- Subo1978
- super3
- Tamas Blummer
- theuni
- Thomas Holenstein
- Timon Rapp
- Timothy Stranex
- Tom Geller
- Torstein Husebø
- Vaclav Vobornik
- vhf / victor felder
- Vinnie Falco
- Warren Togami
- Wil Bown
- Wladimir J. van der Laan
Bitcoin-Qt version 0.8.6 final is now available from:

  http://sourceforge.net/projects/bitcoin/files/Bitcoin/bitcoin-0.8.6/

This is a maintenance release to fix a critical bug; we urge all users to upgrade.

Please report bugs using the issue tracker at github:

  https://github.com/bitcoin/bitcoin/issues

How to Upgrade
--------------

If you already downloaded 0.8.6rc1 you do not need to re-download. This release is exactly the same.

If you are running an older version, shut it down. Wait
until it has completely shut down (which might take a few minutes for older
versions), then run the installer (on Windows) or just copy over
/Applications/Bitcoin-Qt (on Mac) or bitcoind/bitcoin-qt (on Linux).

If you are upgrading from version 0.7.2 or earlier, the first time you
run 0.8.6 your blockchain files will be re-indexed, which will take
anywhere from 30 minutes to several hours, depending on the speed of
your machine.

0.8.6 Release notes
===================

- Default block size increase for miners.
  (see https://gist.github.com/gavinandresen/7670433#086-accept-into-block)

- Remove the all-outputs-must-be-greater-than-CENT-to-qualify-as-free rule for relaying
  (see https://gist.github.com/gavinandresen/7670433#086-relaying)

- Lower maximum size for free transaction creation
  (see https://gist.github.com/gavinandresen/7670433#086-wallet)

- OSX block chain database corruption fixes
  - Update leveldb to 1.13
  - Use fcntl with `F_FULLSYNC` instead of fsync on OSX
  - Use native Darwin memory barriers
  - Replace use of mmap in leveldb for improved reliability (only on OSX)

- Fix nodes forwarding transactions with empty vins and getting banned

- Network code performance and robustness improvements

- Additional debug.log logging for diagnosis of network problems, log timestamps by default

- Fix Bitcoin-Qt startup crash when clicking dock icon on OSX 

- Fix memory leaks in CKey::SetCompactSignature() and Key::SignCompact()

- Fix rare GUI crash on send

- Various small GUI, documentation and build fixes

Warning
-------

- There have been frequent reports of users running out of virtual memory on 32-bit systems
  during the initial sync.
  Hence it is recommended to use a 64-bit executable if possible.
  A 64-bit executable for Windows is planned for 0.9.

Note: Gavin Andresen's GPG signing key for SHA256SUMS.asc has been changed from  key id 1FC730C1 to sub key 7BF6E212 (see https://github.com/bitcoin/bitcoin.org/pull/279).
Bitcoin-Qt version 0.8.5 is now available from:
  http://sourceforge.net/projects/bitcoin/files/Bitcoin/bitcoin-0.8.5/

This is a maintenance release to fix a critical bug;
we urge all users to upgrade.

Please report bugs using the issue tracker at github:
  https://github.com/bitcoin/bitcoin/issues


How to Upgrade
--------------

If you are running an older version, shut it down. Wait
until it has completely shut down (which might take a few minutes for older
versions), then run the installer (on Windows) or just copy over
/Applications/Bitcoin-Qt (on Mac) or bitcoind/bitcoin-qt (on Linux).

If you are upgrading from version 0.7.2 or earlier, the first time you
run 0.8.5 your blockchain files will be re-indexed, which will take
anywhere from 30 minutes to several hours, depending on the speed of
your machine.

0.8.5 Release notes
===================

Bugs fixed
----------

Transactions with version numbers larger than 0x7fffffff were
incorrectly being relayed and included in blocks.

Blocks containing transactions with version numbers larger
than 0x7fffffff caused the code that checks for LevelDB database
inconsistencies at startup to erroneously report database
corruption and suggest that you reindex your database.

This release also contains a non-critical fix to the code that
enforces BIP 34 (block height in the coinbase transaction).

--

Thanks to Gregory Maxwell and Pieter Wuille for quickly
identifying and fixing the transaction version number bug.
Bitcoin-Qt version 0.8.4 is now available from:
  http://sourceforge.net/projects/bitcoin/files/Bitcoin/bitcoin-0.8.4/

This is a maintenance release to fix a critical bug and three
security issues; we urge all users to upgrade.

Please report bugs using the issue tracker at github:
  https://github.com/bitcoin/bitcoin/issues


How to Upgrade
--------------

If you are running an older version, shut it down. Wait
until it has completely shut down (which might take a few minutes for older
versions), then run the installer (on Windows) or just copy over
/Applications/Bitcoin-Qt (on Mac) or bitcoind/bitcoin-qt (on Linux).

If you are upgrading from version 0.7.2 or earlier, the first time you
run 0.8.4 your blockchain files will be re-indexed, which will take
anywhere from 30 minutes to several hours, depending on the speed of
your machine.

0.8.4 Release notes
===================

Security issues
---------------

An attacker could send a series of messages that resulted in
an integer division-by-zero error in the Bloom Filter handling
code, causing the Bitcoin-Qt or bitcoind process to crash.
Bloom filters were introduced with version 0.8, so versions 0.8.0
through 0.8.3 are vulnerable to this critical denial-of-service attack.

A constant-time algorithm is now used to check RPC password
guess attempts; fixes https://github.com/bitcoin/bitcoin/issues/2838
(CVE-2013-4165)

Implement a better fix for the fill-memory-with-orphan-transactions
attack that was fixed in 0.8.3. See
https://bitslog.wordpress.com/2013/07/18/buggy-cve-2013-4627-patch-open-new-vectors-of-attack/
for a description of the weaknesses of the previous fix.
(CVE-2013-4627)

Bugs fixed
----------

Fix multi-block reorg transaction resurrection.

Fix non-standard disconnected transactions causing mempool orphans.
This bug could cause nodes running with the -debug flag to crash.

OSX: use 'FD_FULLSYNC' with LevelDB, which will (hopefully!)
prevent the database corruption issues many people have
experienced on OSX.

Linux: clicking on bitcoin: links was broken if you were using
a Gnome-based desktop.

Fix a hang-at-shutdown bug that only affects users that compile
their own version of Bitcoin against Boost versions 1.50-1.52.

Other changes
-------------

Checkpoint at block 250,000 to speed up initial block downloads
and make the progress indicator when downloading more accurate.


Thanks to everybody who contributed to the 0.8.4 releases!
----------------------------------------------------------

Pieter Wuille
Warren Togami
Patrick Strateman
pakt
Gregory Maxwell
Sergio Demian Lerner
grayleonard
Cory Fields
Matt Corallo
Gavin Andresen
Bitcoin-Qt version 0.8.3 is now available from:
  http://sourceforge.net/projects/bitcoin/files/Bitcoin/bitcoin-0.8.3/

This is a maintenance release to fix a denial-of-service attack that
can cause nodes to crash.

Please report bugs using the issue tracker at github:
  https://github.com/bitcoin/bitcoin/issues

0.8.3 Release notes

Truncate over-size messages to prevent a memory exhaustion attack.

Fix a regression that causes excessive re-writing of the 'peers.dat' file.


Thanks to Peter Todd for responsibly disclosing the vulnerability
( CVE-2013-4627 ) and creating a fix.
Bitcoin-Qt version 0.8.2 is now available from:
  http://sourceforge.net/projects/bitcoin/files/Bitcoin/bitcoin-0.8.2/

This is a maintenance release that fixes many bugs and includes
a few small new features.

Please report bugs using the issue tracker at github:
  https://github.com/bitcoin/bitcoin/issues


How to Upgrade

If you are running an older version, shut it down. Wait
until it has completely shut down (which might take a few minutes for older
versions), then run the installer (on Windows) or just copy over
/Applications/Bitcoin-Qt (on Mac) or bitcoind/bitcoin-qt (on Linux).

If you are upgrading from version 0.7.2 or earlier, the first time you
run 0.8.2 your blockchain files will be re-indexed, which will take
anywhere from 30 minutes to several hours, depending on the speed of
your machine.

0.8.2 Release notes

Fee Policy changes

The default fee for low-priority transactions is lowered from 0.0005 BTC 
(for each 1,000 bytes in the transaction; an average transaction is
about 500 bytes) to 0.0001 BTC.

Payments (transaction outputs) of 0.543 times the minimum relay fee
(0.00005430 BTC) are now considered 'non-standard', because storing them
costs the network more than they are worth and spending them will usually
cost their owner more in transaction fees than they are worth.

Non-standard transactions are not relayed across the network, are not included
in blocks by most miners, and will not show up in your wallet until they are
included in a block.

The default fee policy can be overridden using the -mintxfee and -minrelaytxfee
command-line options, but note that we intend to replace the hard-coded fees
with code that automatically calculates and suggests appropriate fees in the
0.9 release and note that if you set a fee policy significantly different from
the rest of the network your transactions may never confirm.

Bitcoin-Qt changes

* New icon and splash screen
* Improve reporting of synchronization process
* Remove hardcoded fee recommendations
* Improve metadata of executable on MacOSX and Windows
* Move export button to individual tabs instead of toolbar
* Add "send coins" command to context menu in address book
* Add "copy txid" command to copy transaction IDs from transaction overview
* Save & restore window size and position when showing & hiding window
* New translations: Arabic (ar), Bosnian (bs), Catalan (ca), Welsh (cy),
  Esperanto (eo), Interlingua (la), Latvian (lv) and many improvements
  to current translations

MacOSX:
* OSX support for click-to-pay (bitcoin:) links
* Fix GUI disappearing problem on MacOSX (issue #1522)

Linux/Unix:
* Copy addresses to middle-mouse-button clipboard


Command-line options

* -walletnotify will call a command on receiving transactions that affect the wallet.
* -alertnotify will call a command on receiving an alert from the network.
* -par now takes a negative number, to leave a certain amount of cores free.

JSON-RPC API changes

* fixed a getblocktemplate bug that caused excessive CPU creating blocks.
* listunspent now lists account and address information.
* getinfo now also returns the time adjustment estimated from your peers.
* getpeerinfo now returns bytessent, bytesrecv and syncnode.
* gettxoutsetinfo returns statistics about the unspent transaction output database.
* gettxout returns information about a specific unspent transaction output.


Networking changes

* Significant changes to the networking code, reducing latency and memory consumption.
* Avoid initial block download stalling.
* Remove IRC seeding support.
* Performance tweaks.
* Added testnet DNS seeds.

Wallet compatibility/rescuing

* Cases where wallets cannot be opened in another version/installation should be reduced.
* -salvagewallet now works for encrypted wallets.


Known Bugs

* Entering the 'getblocktemplate' or 'getwork' RPC commands into the Bitcoin-Qt debug
console will cause Bitcoin-Qt to crash. Run Bitcoin-Qt with the -server command-line
option to workaround.

Thanks to everybody who contributed to the 0.8.2 release!

APerson241
Andrew Poelstra
Calvin Owens
Chuck LeDuc Díaz
Colin Dean
David Griffith
David Serrano
Eric Lombrozo
Gavin Andresen
Gregory Maxwell
Jeff Garzik
Jonas Schnelli
Larry Gilbert
Luke Dashjr
Matt Corallo
Michael Ford
Mike Hearn
Patrick Brown
Peter Todd
Philip Kaufmann
Pieter Wuille
Richard Schwab
Roman Mindalev
Scott Howard
Tariq Bashir
Warren Togami
Wladimir J. van der Laan
freewil
gladoscc
kjj2
mb300sd
super3
Bitcoin-Qt/bitcoind version 0.8.1 is now available from:
  http://sourceforge.net/projects/bitcoin/files/Bitcoin/bitcoin-0.8.1/

This is a maintenance release that adds a new network rule to avoid
a chain-forking incompatibility with versions 0.7.2 and earlier.

Please report bugs using the issue tracker at github:
  https://github.com/bitcoin/bitcoin/issues


How to Upgrade
--------------

If you are running an older version, shut it down. Wait
until it has completely shut down (which might take a few minutes for older
versions), then run the installer (on Windows) or just copy over
/Applications/Bitcoin-Qt (on Mac) or bitcoind/bitcoin-qt (on Linux).

If you are upgrading from version 0.7.2 or earlier, the first time you
run 0.8.1 your blockchain files will be re-indexed, which will take
anywhere from 30 minutes to several hours, depending on the speed of
your machine.
Bitcoin-Qt version 0.8.0 is now available from:
  http://sourceforge.net/projects/bitcoin/files/Bitcoin/bitcoin-0.8.0/

This is a major release designed to improve performance and handle the
increasing volume of transactions on the network.

Please report bugs using the issue tracker at github:
  https://github.com/bitcoin/bitcoin/issues

How to Upgrade
--------------

If you are running an older version, shut it down. Wait
until it has completely shut down (which might take a few minutes for older
versions), then run the installer (on Windows) or just copy over
/Applications/Bitcoin-Qt (on Mac) or bitcoind/bitcoin-qt (on Linux).

The first time you run after the upgrade a re-indexing process will be
started that will take anywhere from 30 minutes to several hours,
depending on the speed of your machine.

Incompatible Changes
--------------------

This release no longer maintains a full index of historical transaction ids
by default, so looking up an arbitrary transaction using the getrawtransaction
RPC call will not work. If you need that functionality, you must run once
with -txindex=1 -reindex=1 to rebuild block-chain indices (see below for more
details).

Improvements
------------

Mac and Windows binaries are signed with certificates owned by the Bitcoin
Foundation, to be compatible with the new security features in OSX 10.8 and
Windows 8.

LevelDB, a fast, open-source, non-relational database from Google, is
now used to store transaction and block indices.  LevelDB works much better
on machines with slow I/O and is faster in general. Berkeley DB is now only
used for the wallet.dat file (public and private wallet keys and transactions
relevant to you).

Pieter Wuille implemented many optimizations to the way transactions are
verified, so a running, synchronized node uses less working memory and does
much less I/O. He also implemented parallel signature checking, so if you
have a multi-CPU machine all CPUs will be used to verify transactions.

New Features
------------

"Bloom filter" support in the network protocol for sending only relevant transactions to
lightweight clients.

contrib/verifysfbinaries is a shell-script to verify that the binary downloads
at sourceforge have not been tampered with. If you are able, you can help make
everybody's downloads more secure by running this occasionally to check PGP
signatures against download file checksums.

contrib/spendfrom is a python-language command-line utility that demonstrates
how to use the "raw transactions" JSON-RPC api to send coins received from particular
addresses (also known as "coin control").

New/changed settings (command-line or bitcoin.conf file)
--------------------------------------------------------

dbcache : controls LevelDB memory usage.

par : controls how many threads to use to validate transactions. Defaults to the number
of CPUs on your machine, use -par=1 to limit to a single CPU.

txindex : maintains an extra index of old, spent transaction ids so they will be found
by the getrawtransaction JSON-RPC method.

reindex : rebuild block and transaction indices from the downloaded block data.

New JSON-RPC API Features
-------------------------

lockunspent / listlockunspent allow locking transaction outputs for a period of time so
they will not be spent by other processes that might be accessing the same wallet.

addnode / getaddednodeinfo methods, to connect to specific peers without restarting.

importprivkey now takes an optional boolean parameter (default true) to control whether
or not to rescan the blockchain for transactions after importing a new private key.

Important Bug Fixes
-------------------

Privacy leak: the position of the "change" output in most transactions was not being
properly randomized, making network analysis of the transaction graph to identify
users' wallets easier. 

Zero-confirmation transaction vulnerability: accepting zero-confirmation transactions
(transactions that have not yet been included in a block) from somebody you do not
trust is still not recommended, because there will always be ways for attackers to
double-spend zero-confirmation transactions. However, this release includes a bug
fix that makes it a little bit more difficult for attackers to double-spend a
certain type ("lockTime in the future") of zero-confirmation transaction.

Dependency Changes
------------------

Qt 4.8.3 (compiling against older versions of Qt 4 should continue to work)


Thanks to everybody who contributed to this release:
----------------------------------------------------

Alexander Kjeldaas
Andrey Alekseenko
Arnav Singh
Christian von Roques
Eric Lombrozo
Forrest Voight
Gavin Andresen
Gregory Maxwell
Jeff Garzik
Luke Dashjr
Matt Corallo
Mike Cassano
Mike Hearn
Peter Todd
Philip Kaufmann
Pieter Wuille
Richard Schwab
Robert Backhaus
Rune K. Svendsen
Sergio Demian Lerner
Wladimir J. van der Laan
burger2
default
fanquake
grimd34th
justmoon
redshark1802
tucenaber
xanatos
Bitcoin version 0.7.2 is now available from:
  http://sourceforge.net/projects/bitcoin/files/Bitcoin/bitcoin-0.7.2

This is a bug-fix minor release.

Please report bugs using the issue tracker at github:
  https://github.com/bitcoin/bitcoin/issues

How to Upgrade
--------------

If you are running an older version, shut it down. Wait
until it has completely shut down (which might take a few minutes for older
versions), then run the installer (on Windows) or just copy over
/Applications/Bitcoin-Qt (on Mac) or bitcoind/bitcoin-qt (on Linux).

If you were running on Linux with a version that might have been compiled
with a different version of Berkeley DB (for example, if you were using an
Ubuntu PPA version), then run the old version again with the -detachdb
argument and shut it down; if you do not, then the new version will not
be able to read the database files and will exit with an error.

Explanation of -detachdb (and the new "stop true" RPC command):
The Berkeley DB database library stores data in both ".dat" and
"log" files, so the database is always in a consistent state,
even in case of power failure or other sudden shutdown. The
format of the ".dat" files is portable between different
versions of Berkeley DB, but the "log" files are not-- even minor
version differences may have incompatible "log" files. The
-detachdb option moves any pending changes from the "log" files
to the "blkindex.dat" file for maximum compatibility, but makes
shutdown much slower. Note that the "wallet.dat" file is always
detached, and versions prior to 0.6.0 detached all databases
at shutdown.

Bug fixes
---------

* Prevent RPC 'move' from deadlocking. This was caused by trying to lock the
  database twice.

* Fix use-after-free problems in initialization and shutdown, the latter of
  which caused Bitcoin-Qt to crash on Windows when exiting.

* Correct library linking so building on Windows natively works.

* Avoid a race condition and out-of-bounds read in block creation/mining code.

* Improve platform compatibility quirks, including fix for 100% CPU utilization
  on FreeBSD 9.

* A few minor corrections to error handling, and updated translations.

* OSX 10.5 supported again

----------------------------------------------------
Thanks to everybody who contributed to this release:

Alex
dansmith
Gavin Andresen
Gregory Maxwell
Jeff Garzik
Luke Dashjr
Philip Kaufmann
Pieter Wuille
Wladimir J. van der Laan
grimd34th
Bitcoin version 0.7.1 is now available from:
  http://sourceforge.net/projects/bitcoin/files/Bitcoin/bitcoin-0.7.1/

This is a bug-fix minor release.

Please report bugs using the issue tracker at github:
  https://github.com/bitcoin/bitcoin/issues

Project source code is hosted at github; you can get
source-only tarballs/zipballs directly from there:
  https://github.com/bitcoin/bitcoin/tarball/v0.7.1  # .tar.gz
  https://github.com/bitcoin/bitcoin/zipball/v0.7.1  # .zip

Ubuntu Linux users can use the "Personal Package Archive" (PPA)
maintained by Matt Corallo to automatically keep 
up-to-date.  Just type:
  sudo apt-add-repository ppa:bitcoin/bitcoin
  sudo apt-get update
in your terminal, then install the bitcoin-qt package:
  sudo apt-get install bitcoin-qt

KNOWN ISSUES
------------

Mac OSX 10.5 is no longer supported.

How to Upgrade
--------------

If you are running an older version, shut it down. Wait
until it has completely shut down (which might take a few minutes for older
versions), then run the installer (on Windows) or just copy over
/Applications/Bitcoin-Qt (on Mac) or bitcoind/bitcoin-qt (on Linux).

If you were running on Linux with a version that might have been compiled
with a different version of Berkeley DB (for example, if you were using an
Ubuntu PPA version), then run the old version again with the -detachdb
argument and shut it down; if you do not, then the new version will not
be able to read the database files and will exit with an error.

Explanation of -detachdb (and the new "stop true" RPC command):
The Berkeley DB database library stores data in both ".dat" and
"log" files, so the database is always in a consistent state,
even in case of power failure or other sudden shutdown. The
format of the ".dat" files is portable between different
versions of Berkeley DB, but the "log" files are not-- even minor
version differences may have incompatible "log" files. The
-detachdb option moves any pending changes from the "log" files
to the "blkindex.dat" file for maximum compatibility, but makes
shutdown much slower. Note that the "wallet.dat" file is always
detached, and versions prior to 0.6.0 detached all databases
at shutdown.

New features
------------

* Added a boolean argument to the RPC 'stop' command, if true sets
  -detachdb to create standalone database .dat files before shutting down.

* -salvagewallet command-line option, which moves any existing wallet.dat
  to wallet.{timestamp}.dat and then attempts to salvage public/private
  keys and master encryption keys (if the wallet is encrypted) into
  a new wallet.dat. This should only be used if your wallet becomes
  corrupted, and is not intended to replace regular wallet backups.

* Import $DataDir/bootstrap.dat automatically, if it exists.

Dependency changes
------------------

* Qt 4.8.2 for Windows builds

* openssl 1.0.1c

Bug fixes
---------

* Clicking on a bitcoin: URI on Windows should now launch Bitcoin-Qt properly.

* When running -testnet, use RPC port 18332 by default.

* Better detection and handling of corrupt wallet.dat and blkindex.dat files.
  Previous versions would crash with a DB_RUNRECOVERY exception, this
  version detects most problems and tells you how to recover if it
  cannot recover itself.

* Fixed an uninitialized variable bug that could cause transactions to
  be reported out of order.

* Fixed a bug that could cause occasional crashes on exit.

* Warn the user that they need to create fresh wallet backups after they
  encrypt their wallet.

----------------------------------------------------
Thanks to everybody who contributed to this release:

Gavin Andresen
Jeff Garzik
Luke Dashjr
Mark Friedenbach
Matt Corallo
Philip Kaufmann
Pieter Wuille
Rune K. Svendsen
Virgil Dupras
Wladimir J. van der Laan
fanquake
kjj2
xanatos
Bitcoin version 0.7.0 is now available for download at:

We recommend that everybody running prior versions of bitcoind/Bitcoin-Qt
upgrade to this release, except for users running Mac OSX 10.5.

Please report bugs using the issue tracker at github:
  https://github.com/bitcoin/bitcoin/issues

Project source code is hosted at github; you can get
source-only tarballs/zipballs directly from there:
  https://github.com/bitcoin/bitcoin/tarball/v0.7.0  # .tar.gz
  https://github.com/bitcoin/bitcoin/zipball/v0.7.0  # .zip

Ubuntu Linux users can use the "Personal Package Archive" (PPA)
maintained by Matt Corallo to automatically keep 
bitcoin up-to-date.  Just type
  sudo apt-add-repository ppa:bitcoin/bitcoin
  sudo apt-get update
in your terminal, then install the bitcoin-qt package:
  sudo apt-get install bitcoin-qt


How to Upgrade

If you are running an older version, shut it down. Wait
until it has completely shut down (which might take a few minutes for older
versions), then run the installer (on Windows) or just copy over
Code:
/Applications/Bitcoin-Qt
(on Mac) or
Code:
bitcoind/bitcoin-qt
(on Linux).

If you were running on Linux with a version that might have been compiled
with a different version of Berkeley DB (for example, if you were using the
PPA and are switching to the binary release), then run the old version again
with the -detachdb argument and shut it down; if you do not, then the new
version will not be able to read the database files and will exit with an error.

Incompatible Changes

* Replaced the 'getmemorypool' RPC command with 'getblocktemplate/submitblock'
  and 'getrawmempool' commands.
* Remove deprecated RPC 'getblocknumber'

Bitcoin Improvement Proposals implemented

BIP 22 - 'getblocktemplate', 'submitblock' RPCs
BIP 34 - block version 2, height in coinbase
BIP 35 - 'mempool' message, extended 'getdata' message behavior


Core bitcoin handling and blockchain database

* Reduced CPU usage, by eliminating some redundant hash calculations
* Cache signature verifications, to eliminate redundant signature checks
* Transactions with zero-value outputs are considered non-standard
* Mining: when creating new blocks, sort 'paid' area by fee-per-kb
* Database: better validation of on-disk stored data
* Database: minor optimizations and reliability improvements
* -loadblock=FILE will import an external block file
* Additional DoS (denial-of-service) prevention measures
* New blockchain checkpoint at block 193,000


JSON-RPC API

* Internal HTTP server is now thread-per-connection, rather than
  a single-threaded queue that would stall on network I/O.
* Internal HTTP server supports HTTP/1.1, pipelined requests and
  connection keep-alive.
* Support JSON-RPC 2.0 batches, to encapsulate multiple JSON-RPC requests
  within a single HTTP request.
* IPv6 support
* Added raw transaction API.  See https://gist.github.com/2839617
* Added 'getrawmempool', to list contents of TX memory pool
* Added 'getpeerinfo', to list data about each connected network peer
* Added 'listaddressgroupings' for better coin control
* Rework getblock call.
* Remove deprecated RPC 'getblocknumber'
* Remove superceded RPC 'getmemorypool' (see BIP 22, above)
* listtransactions output now displays "smart" times for transactions,
  and 'blocktime' and 'timereceived' fields were added


P2P networking

* IPv6 support
* Tor hidden service support (see doc/Tor.txt)
* Attempts to fix "stuck blockchain download" problems
* Replace BDB database "addr.dat" with internally-managed "peers.dat"
  file containing peer address data.
* Lower default send buffer from 10MB to 1MB
* proxy: SOCKS5 by default
* Support connecting by hostnames passed to proxy
* Add -seednode connections, and use this instead of DNS seeds when proxied
* Added -externalip and -discover
* Add -onlynet to connect only to a given network (IPv4, IPv6, or Tor)
* Separate listening sockets, -bind=<addr>


Qt GUI

* Add UI RPC console / debug window
* Re-Enable URI handling on Windows, add safety checks and tray-notifications
* Harmonize the use of ellipsis ("...") to be used in menus, but not on buttons
* Add 2 labels to the overviewpage that display Wallet and Transaction status (obsolete or current)
* Extend the optionsdialog (e.g. language selection) and re-work it to a tabbed UI
* Merge sign/verify message into a single window with tabbed UI
* Ensure a changed bitcoin unit immediately updates all GUI elements that use units
* Update QR Code dialog
* Improve error reporting at startup
* Fine-grained UI updates for a much smoother UI during block downloads
* Remove autocorrection of 0/i in addresses in UI
* Reorganize tray icon menu into more logical order
* Persistently poll for balance change when number of blocks changed
* Much better translations
* Override progress bar design on platforms with segmented progress bars to assist with readability
* Added 'immature balance' display on the overview page
* (Windows only): enable ASLR and DEP for bitcoin-qt.exe
* (Windows only): add meta-data to bitcoin-qt.exe (e.g. description)

Internal codebase

* Additional unit tests
* Compile warning fixes


Miscellaneous

* Reopen debug.log upon SIGHUP
* Bash programmable completion for bitcoind(1)
* On supported OS's, each thread is given a useful name


Thanks to everybody who contributed to this release:

Chris Moore
Christian von Roques
David Joel Schwartz
Douglas Huff
Fordy
Gavin Andresen
Giel van Schijndel
Gregory Maxwell
Jeff Garzik
Luke Dashjr
Matt Corallo
Michael Ford
Michael Hendricks
Peter Todd
Philip Kaufmann
Pieter Wuille
R E Broadley
Ricardo M. Correia
Rune K. Svendsen
Scott Ellis
Stephane Glondu
Wladimir J. van der Laan
cardpuncher
coderrr
fanquake
grimd34th
sje397
xanatos

Thanks to Sergio Lerner for reporting denial-of-service vulnerabilities fixed in this release.
Bitcoin version 0.6.3 is now available for download at:

This is a bug-fix release, with no new features.

Please report bugs using the issue tracker at github:
  https://github.com/bitcoin/bitcoin/issues

CHANGE SUMMARY

Fixed a serious denial-of-service attack that could cause the
bitcoin process to become unresponsive. Thanks to Sergio Lerner
for finding and responsibly reporting the problem. (CVE-2012-3789)

Optimized the process of checking transaction signatures, to
speed up processing of new block messages and make propagating
blocks across the network faster.

Fixed an obscure bug that could cause the bitcoin process to get
stuck on an invalid block-chain, if the invalid chain was
hundreds of blocks long.

Bitcoin-Qt no longer automatically selects the first address
in the address book (Issue #1384).

Fixed minimize-to-dock behavior of Bitcoin-Qt on the Mac.

Added a block checkpoint at block 185,333 to speed up initial
blockchain download.
Bitcoin version 0.6.2 is now available for download at:

This is a bug-fix and code-cleanup release, with no major new features.

Please report bugs using the github issue tracker at:
https://github.com/bitcoin/bitcoin/issues


NOTABLE CHANGES

Much faster shutdowns. However, the blkindex.dat file is no longer
portable to different data directories by default. If you need a
portable blkindex.dat file then run with the new -detachdb=1 option
or the "Detach databases at shutdown" GUI preference.

Fixed https://github.com/bitcoin/bitcoin/issues/1065, a bug that
could cause long-running nodes to crash.

Mac and Windows binaries are compiled against OpenSSL 1.0.1b (Linux
binaries are dynamically linked to the version of OpenSSL on the system).


CHANGE SUMMARY

Use 'git shortlog --no-merges v0.6.0..' for a summary of this release.

Source codebase changes:
- Many source code cleanups and warnings fixes.  Close to building with -Wall
- Locking overhaul, and several minor locking fixes
- Several source code portability fixes, e.g. FreeBSD

JSON-RPC interface changes:
- addmultisigaddress enabled for mainnet (previously only enabled for testnet)

Network protocol changes:
- protocol version 60001
- added nonce value to "ping" message (BIP 31)
- added new "pong" message (BIP 31)

Backend storage changes:
- Less redundant database flushing, especially during initial block download
- Shutdown improvements (see above)

Qt user interface:
- minor URI handling improvements
- progressbar improvements
- error handling improvements (show message box rather than console exception,
etc.)
- by popular request, make 4th bar of connection icon green
Never released

Bitcoin version 0.6.0 is now available for download at:

This release includes more than 20 language localizations.
More translations are welcome; join the
project at Transifex to help:
https://www.transifex.net/projects/p/bitcoin/

Please report bugs using the issue tracker at github:
https://github.com/bitcoin/bitcoin/issues

Project source code is hosted at github; we are no longer
distributing .tar.gz files here, you can get them
directly from github:
https://github.com/bitcoin/bitcoin/tarball/v0.6.0  # .tar.gz
https://github.com/bitcoin/bitcoin/zipball/v0.6.0  # .zip

For Ubuntu users, there is a ppa maintained by Matt Corallo which
you can add to your system so that it will automatically keep
bitcoin up-to-date.  Just type
sudo apt-add-repository ppa:bitcoin/bitcoin
in your terminal, then install the bitcoin-qt package.


KNOWN ISSUES

Shutting down while synchronizing with the network
(downloading the blockchain) can take more than a minute,
because database writes are queued to speed up download
time.


NEW FEATURES SINCE BITCOIN VERSION 0.5

Initial network synchronization should be much faster
(one or two hours on a typical machine instead of ten or more
hours).

Backup Wallet menu option.

Bitcoin-Qt can display and save QR codes for sending
and receiving addresses.

New context menu on addresses to copy/edit/delete them.

New Sign Message dialog that allows you to prove that you
own a bitcoin address by creating a digital
signature.

New wallets created with this version will
use 33-byte 'compressed' public keys instead of
65-byte public keys, resulting in smaller
transactions and less traffic on the bitcoin
network. The shorter keys are already supported
by the network but wallet.dat files containing
short keys are not compatible with earlier
versions of Bitcoin-Qt/bitcoind.

New command-line argument -blocknotify=<command>
that will spawn a shell process to run <command> 
when a new block is accepted.

New command-line argument -splash=0 to disable
Bitcoin-Qt's initial splash screen

validateaddress JSON-RPC api command output includes
two new fields for addresses in the wallet:
pubkey : hexadecimal public key
iscompressed : true if pubkey is a short 33-byte key

New JSON-RPC api commands for dumping/importing
private keys from the wallet (dumprivkey, importprivkey).

New JSON-RPC api command for getting information about
blocks (getblock, getblockhash).

New JSON-RPC api command (getmininginfo) for getting
extra information related to mining. The getinfo
JSON-RPC command no longer includes mining-related
information (generate/genproclimit/hashespersec).



NOTABLE CHANGES

BIP30 implemented (security fix for an attack involving
duplicate "coinbase transactions").

The -nolisten, -noupnp and -nodnsseed command-line
options were renamed to -listen, -upnp and -dnsseed,
with a default value of 1. The old names are still
supported for compatibility (so specifying -nolisten
is automatically interpreted as -listen=0; every
boolean argument can now be specified as either
-foo or -nofoo).

The -noirc command-line options was renamed to
-irc, with a default value of 0. Run -irc=1 to
get the old behavior.

Three fill-up-available-memory denial-of-service
attacks were fixed.


NOT YET IMPLEMENTED FEATURES

Support for clicking on bitcoin: URIs and
opening/launching Bitcoin-Qt is available only on Linux,
and only if you configure your desktop to launch
Bitcoin-Qt. All platforms support dragging and dropping
bitcoin: URIs onto the Bitcoin-Qt window to start
payment.


PRELIMINARY SUPPORT FOR MULTISIGNATURE TRANSACTIONS

This release has preliminary support for multisignature
transactions-- transactions that require authorization
from more than one person or device before they
will be accepted by the bitcoin network.

Prior to this release, multisignature transactions
were considered 'non-standard' and were ignored;
with this release multisignature transactions are
considered standard and will start to be relayed
and accepted into blocks.

It is expected that future releases of Bitcoin-Qt
will support the creation of multisignature transactions,
once enough of the network has upgraded so relaying
and validating them is robust.

For this release, creation and testing of multisignature
transactions is limited to the bitcoin test network using
the "addmultisigaddress" JSON-RPC api call.

Short multisignature address support is included in this
release, as specified in BIP 13 and BIP 16.
bitcoind and Bitcoin-Qt version 0.5.5 are now available for download at:
Windows: installer | zip (sig)
Source: tar.gz
bitcoind and Bitcoin-Qt version 0.6.0.7 are also tagged in git, but it is recommended to upgrade to 0.6.1.

These are bugfix-only releases.

Please report bugs by replying to this forum thread. Note that the 0.4.x wxBitcoin GUI client is no longer maintained nor supported. If someone would like to step up to maintain this, they should contact Luke-Jr.

BUG FIXES

Version 0.6.0 allowed importing invalid "private keys", which would be unspendable; 0.6.0.7 will now verify the private key is valid, and refuse to import an invalid one
Verify status of encrypt/decrypt calls to detect failed padding
Check blocks for duplicate transactions earlier. Fixes #1167
Upgrade Windows builds to OpenSSL 1.0.1b
Set label when selecting an address that already has a label. Fixes #1080 (Bitcoin-Qt)
JSON-RPC listtransactions's from/count handling is now fixed
Optimize and fix multithreaded access, when checking whether we already know about transactions
Fix potential networking deadlock
Proper support for Growl 1.3 notifications
Display an error, rather than crashing, if encoding a QR Code failed (0.6.0.7)
Don't erroneously set "Display addresses" for users who haven't explicitly enabled it (Bitcoin-Qt)
Some non-ASCII input in JSON-RPC expecting hexadecimal may have been misinterpreted rather than rejected
Missing error condition checking added
Do not show green tick unless all known blocks are downloaded. Fixes #921 (Bitcoin-Qt)
Increase time ago of last block for "up to date" status from 30 to 90 minutes
Show a message box when runaway exception happens (Bitcoin-Qt)
Use a messagebox to display the error when -server is provided without providing a rpc password
Show error message instead of exception crash when unable to bind RPC port (Bitcoin-Qt)
Correct sign message bitcoin address tooltip. Fixes #1050 (Bitcoin-Qt)
Removed "(no label)" from QR Code dialog titlebar if we have no label (0.6.0.7)
Removed an ugly line break in tooltip for mature transactions (0.6.0.7)
Add missing tooltip and key shortcut in settings dialog (part of #1088) (Bitcoin-Qt)
Work around issue in boost::program_options that prevents from compiling in clang
Fixed bugs occurring only on platforms with unsigned characters (such as ARM).
Rename make_windows_icon.py to .sh as it is a shell script. Fixes #1099 (Bitcoin-Qt)
Various trivial internal corrections to types used for counting/size loops and warnings
Bitcoin version 0.5.4 is now available for download at:
NOTE: 0.5.4rc3 is being renamed to 0.5.4 final with no changes.

This is a bugfix-only release in the 0.5.x series, plus a few protocol updates.

Please report bugs using the issue tracker at github:
https://github.com/bitcoin/bitcoin/issues

Stable source code is hosted at Gitorious:
http://gitorious.org/bitcoin/bitcoind-stable/archive-tarball/v0.5.4#.tar.gz

PROTOCOL UPDATES

BIP 16: Special-case "pay to script hash" logic to enable minimal validation of new transactions.
Support for validating message signatures produced with compressed public keys.

BUG FIXES

Build with thread-safe MingW libraries for Windows, fixing a dangerous memory corruption scenario when exceptions are thrown.
Fix broken testnet mining.
Stop excess inventory relay during initial block download.
When disconnecting a node, clear the received buffer so that we do not process any already received messages.
Yet another attempt at implementing "minimize to tray" that works on all operating systems.
Fix Bitcoin-Qt notifications under Growl 1.3.
Increase required age of Bitcoin-Qt's "not up to date" status from 30 to 90 minutes.
Implemented missing verifications that led to crash on entering some wrong passphrases for encrypted wallets.
Fix default filename suffixes in GNOME save dialog.
Make the "Send coins" tab use the configured unit type, even on the first attempt.
Print detailed wallet loading errors to debug.log when it is corrupt.
Allocate exactly the amount of space needed for signing transactions, instead of a fixed 10k buffer.
Workaround for improbable memory access violation.
Check wallet's minimum version before trying to load it.
Remove wxBitcoin properly when installing Bitcoin-Qt over it. (Windows)
Detail reorganization information better in debug log.
Use a messagebox to display the error when -server is provided without configuring a RPC password.
Testing suite build now honours provided CXXFLAGS.
Removed an extraneous line-break in mature transaction tooltips.
Fix some grammatical errors in translation process documentation.
Bitcoin version 0.5.3 is now available for download at:

This is a bugfix-only release based on 0.5.1.
It also includes a few protocol updates.

Please report bugs using the issue tracker at github:
https://github.com/bitcoin/bitcoin/issues

Stable source code is hosted at Gitorious:
http://gitorious.org/bitcoin/bitcoind-stable/archive-tarball/v0.5.3#.tar.gz

PROTOCOL UPDATES

BIP 30: Introduce a new network rule: "a block is not valid if it contains a transaction whose hash already exists in the block chain, unless all that transaction's outputs were already spent before said block" beginning on March 15, 2012, 00:00 UTC.
On testnet, allow mining of min-difficulty blocks if 20 minutes have gone by without mining a regular-difficulty block. This is to make testing Bitcoin easier, and will not affect normal mode.

BUG FIXES

Limit the number of orphan transactions stored in memory, to prevent a potential denial-of-service attack by flooding orphan transactions. Also never store invalid transactions at all.
Fix possible buffer overflow on systems with very long application data paths. This is not exploitable.
Resolved multiple bugs preventing long-term unlocking of encrypted wallets
(issue #922).
Only send local IP in "version" messages if it is globally routable (ie, not private), and try to get such an IP from UPnP if applicable.
Reannounce UPnP port forwards every 20 minutes, to workaround routers expiring old entries, and allow the -upnp option to override any stored setting.
Skip splash screen when -min is used, and fix Minimize to Tray function.
Do not blank "label" in Bitcoin-Qt "Send" tab, if the user has already entered something.
Correct various labels and messages.
Various memory leaks and potential null pointer deferences have been fixed.
Handle invalid Bitcoin URIs using "bitcoin://" instead of "bitcoin:".
Several shutdown issues have been fixed.
Revert to "global progress indication", as starting from zero every time was considered too confusing for many users.
Check that keys stored in the wallet are valid at startup, and if not, report corruption.
Enable accessible widgets on Windows, so that people with screen readers such as NVDA can make sense of it.
Various build fixes.
If no password is specified to bitcoind, recommend a secure password.
Automatically focus and scroll to new "Send coins" entries in Bitcoin-Qt.
Show a message box for --help on Windows, for Bitcoin-Qt.
Add missing "About Qt" menu option to show built-in Qt About dialog.
Don't show "-daemon" as an option for Bitcoin-Qt, since it isn't available.
Update hard-coded fallback seed nodes, choosing recent ones with long uptime and versions at least 0.4.0.
Add checkpoint at block 168,000.
Bitcoin version 0.5.2 is now available for download at:

This is a bugfix-only release based on 0.5.1.

Please report bugs using the issue tracker at github:
https://github.com/bitcoin/bitcoin/issues

Stable source code is hosted at Gitorious:
http://gitorious.org/bitcoin/bitcoind-stable/archive-tarball/v0.5.2#.tar.gz

BUG FIXES

Check all transactions in blocks after the last checkpoint (0.5.0 and 0.5.1 skipped checking ECDSA signatures during initial blockchain download).
Cease locking memory used by non-sensitive information (this caused a huge performance hit on some platforms, especially noticable during initial blockchain download; this was
not a security vulnerability).
Fixed some address-handling deadlocks (client freezes).
No longer accept inbound connections over the internet when Bitcoin is being used with Tor (identity leak).
Re-enable SSL support for the JSON-RPC interface (it was unintentionally disabled for the 0.5.0 and 0.5.1 release Linux binaries).
Use the correct base transaction fee of 0.0005 BTC for accepting transactions into mined blocks (since 0.4.0, it was incorrectly accepting 0.0001 BTC which was only meant to be relayed).
Don't show "IP" for transactions which are not necessarily IP transactions.
Add new DNS seeds (maintained by Pieter Wuille and Luke Dashjr).
Bitcoin version 0.5.1 is now available for download at:

This is a bugfix-only release.

This release includes 13 translations, including 5 new translations:
Italian, Hungarian, Ukranian, Portuguese (Brazilian) and Simplified Chinese.
More translations are welcome; join the project at Transifex if you can help:
https://www.transifex.net/projects/p/bitcoin/

Please report bugs using the issue tracker at github:
https://github.com/bitcoin/bitcoin/issues

Project source code is hosted at github; we are no longer
distributing .tar.gz files here, you can get them
directly from github:
https://github.com/bitcoin/bitcoin/tarball/v0.5.1  # .tar.gz
https://github.com/bitcoin/bitcoin/zipball/v0.5.1  # .zip

For Ubuntu users, there is a new ppa maintained by Matt Corallo which
you can add to your system so that it will automatically keep
bitcoin up-to-date.  Just type
sudo apt-add-repository ppa:bitcoin/bitcoin
in your terminal, then install the bitcoin-qt package.


BUG FIXES

Re-enable SSL support for the JSON-RPC interface (it was unintentionally
disabled for the 0.5.0 release binaries).

The code that finds peers via "dns seeds" no longer stops bitcoin startup
if one of the dns seed machines is down.

Tooltips on the transaction list view were rendering incorrectly (as black boxes
or with a transparent background).

Prevent a denial-of-service attack involving flooding a bitcoin node with
orphan blocks.

The wallet passphrase dialog now warns you if the caps lock key was pressed.

Improved searching in addresses and labels in bitcoin-qt.
Bitcoin version 0.5.0 is now available for download at:

The major change for this release is a completely new graphical interface that uses the Qt user interface toolkit.

This release include German, Spanish, Spanish-Castilian, Norwegian and Dutch translations. More translations are welcome; join the project at Transifex if you can help:
https://www.transifex.net/projects/p/bitcoin/

Please report bugs using the issue tracker at github:
https://github.com/bitcoin/bitcoin/issues

For Ubuntu users, there is a new ppa maintained by Matt Corallo which you can add to your system so that it will automatically keep bitcoin up-to-date.  Just type "sudo apt-add-repository ppa:bitcoin/bitcoin" in your terminal, then install the bitcoin-qt package.

MAJOR BUG FIX  (CVE-2011-4447)

The wallet encryption feature introduced in Bitcoin version 0.4.0 did not sufficiently secure the private keys. An attacker who
managed to get a copy of your encrypted wallet.dat file might be able to recover some or all of the unencrypted keys and steal the
associated coins.

If you have a previously encrypted wallet.dat, the first time you run bitcoin-qt or bitcoind the wallet will be rewritten, Bitcoin will
shut down, and you will be prompted to restart it to run with the new, properly encrypted file.

If you had a previously encrypted wallet.dat that might have been copied or stolen (for example, you backed it up to a public
location) you should send all of your bitcoins to yourself using a new bitcoin address and stop using any previously generated addresses.

Wallets encrypted with this version of Bitcoin are written properly.

Technical note: the encrypted wallet's 'keypool' will be regenerated the first time you request a new bitcoin address; to be certain that the
new private keys are properly backed up you should:

1. Run Bitcoin and let it rewrite the wallet.dat file

2. Run it again, then ask it for a new bitcoin address.
Bitcoin-Qt: Address Book, then New Address...
bitcoind: run the 'walletpassphrase' RPC command to unlock the wallet,  then run the 'getnewaddress' RPC command.

3. If your encrypted wallet.dat may have been copied or stolen, send  all of your bitcoins to the new bitcoin address.

4. Shut down Bitcoin, then backup the wallet.dat file.
IMPORTANT: be sure to request a new bitcoin address before backing up, so that the 'keypool' is regenerated and backed up.

"Security in depth" is always a good idea, so choosing a secure location for the backup and/or encrypting the backup before uploading it is recommended. And as in previous releases, if your machine is infected by malware there are several ways an attacker might steal your bitcoins.

Thanks to Alan Reiner (etotheipi) for finding and reporting this bug.

MAJOR GUI CHANGES

"Splash" graphics at startup that show address/wallet/blockchain loading progress.

"Synchronizing with network" progress bar to show block-chain download progress.

Icons at the bottom of the window that show how well connected you are to the network, with tooltips to display details.

Drag and drop support for bitcoin: URIs on web pages.

Export transactions as a .csv file.

Many other GUI improvements, large and small.

RPC CHANGES

getmemorypool : new RPC command, provides everything needed to construct a block with a custom generation transaction and submit a solution

listsinceblock : new RPC command, list transactions since given block

signmessage/verifymessage : new RPC commands to sign a message with one of your private keys or verify that a message signed by the private key associated with a bitcoin address.

GENERAL CHANGES

Faster initial block download.
bitcoind version 0.4.6 is now available for download at:
Windows: installer | zip (sig)
Source: tar.gz
bitcoind and Bitcoin-Qt version 0.6.0.7 are also tagged in git, but it is recommended to upgrade to 0.6.1.

These are bugfix-only releases.

Please report bugs by replying to this forum thread. Note that the 0.4.x wxBitcoin GUI client is no longer maintained nor supported. If someone would like to step up to maintain this, they should contact Luke-Jr.

BUG FIXES

Version 0.6.0 allowed importing invalid "private keys", which would be unspendable; 0.6.0.7 will now verify the private key is valid, and refuse to import an invalid one
Verify status of encrypt/decrypt calls to detect failed padding
Check blocks for duplicate transactions earlier. Fixes #1167
Upgrade Windows builds to OpenSSL 1.0.1b
Set label when selecting an address that already has a label. Fixes #1080 (Bitcoin-Qt)
JSON-RPC listtransactions's from/count handling is now fixed
Optimize and fix multithreaded access, when checking whether we already know about transactions
Fix potential networking deadlock
Proper support for Growl 1.3 notifications
Display an error, rather than crashing, if encoding a QR Code failed (0.6.0.7)
Don't erroneously set "Display addresses" for users who haven't explicitly enabled it (Bitcoin-Qt)
Some non-ASCII input in JSON-RPC expecting hexadecimal may have been misinterpreted rather than rejected
Missing error condition checking added
Do not show green tick unless all known blocks are downloaded. Fixes #921 (Bitcoin-Qt)
Increase time ago of last block for "up to date" status from 30 to 90 minutes
Show a message box when runaway exception happens (Bitcoin-Qt)
Use a messagebox to display the error when -server is provided without providing a rpc password
Show error message instead of exception crash when unable to bind RPC port (Bitcoin-Qt)
Correct sign message bitcoin address tooltip. Fixes #1050 (Bitcoin-Qt)
Removed "(no label)" from QR Code dialog titlebar if we have no label (0.6.0.7)
Removed an ugly line break in tooltip for mature transactions (0.6.0.7)
Add missing tooltip and key shortcut in settings dialog (part of #1088) (Bitcoin-Qt)
Work around issue in boost::program_options that prevents from compiling in clang
Fixed bugs occurring only on platforms with unsigned characters (such as ARM).
Rename make_windows_icon.py to .sh as it is a shell script. Fixes #1099 (Bitcoin-Qt)
Various trivial internal corrections to types used for counting/size loops and warnings
Never released or release notes were lost.
Bitcoin version 0.4.4 is now available for download at:

This is a bugfix-only release based on 0.4.0.

Please note that the wxBitcoin GUI client is no longer maintained nor supported. If someone would like to step up to maintain this, they should contact Luke-Jr.

Please report bugs for the daemon only using the issue tracker at github:
https://github.com/bitcoin/bitcoin/issues

Stable source code is hosted at Gitorious:
http://gitorious.org/bitcoin/bitcoind-stable/archive-tarball/v0.4.4#.tar.gz

BUG FIXES

Limit the number of orphan transactions stored in memory, to prevent a potential denial-of-service attack by flooding orphan transactions. Also never store invalid transactions at all.
Fix possible buffer overflow on systems with very long application data paths. This is not exploitable.
Resolved multiple bugs preventing long-term unlocking of encrypted wallets (issue #922).
Only send local IP in "version" messages if it is globally routable (ie, not private), and try to get such an IP from UPnP if applicable.
Reannounce UPnP port forwards every 20 minutes, to workaround routers expiring old entries, and allow the -upnp option to override any stored setting.
Various memory leaks and potential null pointer deferences have been
fixed.
Several shutdown issues have been fixed.
Check that keys stored in the wallet are valid at startup, and if not,
report corruption.
Various build fixes.
If no password is specified to bitcoind, recommend a secure password.
Update hard-coded fallback seed nodes, choosing recent ones with long uptime and versions at least 0.4.0.
Add checkpoint at block 168,000.

bitcoind version 0.4.3 is now available for download at:

This is a bugfix-only release based on 0.4.0.

Please note that the wxBitcoin GUI client is no longer maintained nor supported. If someone would like to step up to maintain this, they should contact Luke-Jr.

Please report bugs for the daemon only using the issue tracker at github:
https://github.com/bitcoin/bitcoin/issues

Stable source code is hosted at Gitorious:
http://gitorious.org/bitcoin/bitcoind-stable/archive-tarball/v0.4.3#.tar.gz

BUG FIXES

Cease locking memory used by non-sensitive information (this caused a huge performance hit on some platforms, especially noticable during initial blockchain download).
Fixed some address-handling deadlocks (client freezes).
No longer accept inbound connections over the internet when Bitcoin is being used with Tor (identity leak).
Use the correct base transaction fee of 0.0005 BTC for accepting transactions into mined blocks (since 0.4.0, it was incorrectly accepting 0.0001 BTC which was only meant to be relayed).
Add new DNS seeds (maintained by Pieter Wuille and Luke Dashjr).

Never released or release notes were lost.
Bitcoin version 0.4.1 is now available for download at:

This is a bugfix only release based on 0.4.0.

Please report bugs by replying to this forum thread.

MAJOR BUG FIX  (CVE-2011-4447)

The wallet encryption feature introduced in Bitcoin version 0.4.0 did not sufficiently secure the private keys. An attacker who
managed to get a copy of your encrypted wallet.dat file might be able to recover some or all of the unencrypted keys and steal the
associated coins.

If you have a previously encrypted wallet.dat, the first time you run wxbitcoin or bitcoind the wallet will be rewritten, Bitcoin will
shut down, and you will be prompted to restart it to run with the new, properly encrypted file.

If you had a previously encrypted wallet.dat that might have been copied or stolen (for example, you backed it up to a public
location) you should send all of your bitcoins to yourself using a new bitcoin address and stop using any previously generated addresses.

Wallets encrypted with this version of Bitcoin are written properly.

Technical note: the encrypted wallet's 'keypool' will be regenerated the first time you request a new bitcoin address; to be certain that the
new private keys are properly backed up you should:

1. Run Bitcoin and let it rewrite the wallet.dat file

2. Run it again, then ask it for a new bitcoin address.
wxBitcoin: new address visible on main window
bitcoind: run the 'walletpassphrase' RPC command to unlock the wallet,  then run the 'getnewaddress' RPC command.

3. If your encrypted wallet.dat may have been copied or stolen, send all of your bitcoins to the new bitcoin address.

4. Shut down Bitcoin, then backup the wallet.dat file.
IMPORTANT: be sure to request a new bitcoin address before backing up, so that the 'keypool' is regenerated and backed up.

"Security in depth" is always a good idea, so choosing a secure location for the backup and/or encrypting the backup before uploading it is recommended. And as in previous releases, if your machine is infected by malware there are several ways an attacker might steal your bitcoins.

Thanks to Alan Reiner (etotheipi) for finding and reporting this bug.
Bitcoin version 0.4.0 is now available for download at:

The main feature in this release is wallet private key encryption;
you can set a passphrase that must be entered before sending coins.
See below for more information; if you decide to encrypt your wallet,
WRITE DOWN YOUR PASSPHRASE AND PUT IT IN A SECURE LOCATION. If you
forget or lose your wallet passphrase, you lose your bitcoins.
Previous versions of bitcoin are unable to read encrypted wallets,
and will crash on startup if the wallet is encrypted.

Also note: bitcoin version 0.4 uses a newer version of Berkeley DB
(bdb version 4.8) than previous versions (bdb 4.7). If you upgrade
to version 0.4 and then revert back to an earlier version of bitcoin
the it may be unable to start because bdb 4.7 cannot read bdb 4.8
"log" files.


Notable bug fixes from version 0.3.24:

Fix several bitcoin-becomes-unresponsive bugs due to multithreading
deadlocks.

Optimize database writes for large (lots of inputs) transactions
(fixes a potential denial-of-service attack)


Wallet Encryption

Bitcoin supports native wallet encryption so that people who steal your
wallet file don't automatically get access to all of your Bitcoins.
In order to enable this feature, choose "Encrypt Wallet" from the
Options menu.  You will be prompted to enter a passphrase, which
will be used as the key to encrypt your wallet and will be needed
every time you wish to send Bitcoins.  If you lose this passphrase,
you will lose access to spend all of the bitcoins in your wallet,
no one, not even the Bitcoin developers can recover your Bitcoins.
This means you are responsible for your own security, store your
passphrase in a secure location and do not forget it.

Remember that the encryption built into bitcoin only encrypts the
actual keys which are required to send your bitcoins, not the full
wallet.  This means that someone who steals your wallet file will
be able to see all the addresses which belong to you, as well as the
relevant transactions, you are only protected from someone spending
your coins.

It is recommended that you backup your wallet file before you
encrypt your wallet.  To do this, close the Bitcoin client and
copy the wallet.dat file from ~/.bitcoin/ on Linux, /Users/(user
name)/Application Support/Bitcoin/ on Mac OSX, and %APPDATA%/Bitcoin/
on Windows (that is /Users/(user name)/AppData/Roaming/Bitcoin on
Windows Vista and 7 and /Documents and Settings/(user name)/Application
Data/Bitcoin on Windows XP).  Once you have copied that file to a
safe location, reopen the Bitcoin client and Encrypt your wallet.
If everything goes fine, delete the backup and enjoy your encrypted
wallet.  Note that once you encrypt your wallet, you will never be
able to go back to a version of the Bitcoin client older than 0.4.

Keep in mind that you are always responsible for your own security.
All it takes is a slightly more advanced wallet-stealing trojan which
installs a keylogger to steal your wallet passphrase as you enter it
in addition to your wallet file and you have lost all your Bitcoins.
Wallet encryption cannot keep you safe if you do not practice
good security, such as running up-to-date antivirus software, only
entering your wallet passphrase in the Bitcoin client and using the
same passphrase only as your wallet passphrase.

See the doc/README file in the bitcoin source for technical details
of wallet encryption.
Bitcoin v0.3.24 is now available for download at

This is another bug fix release.  We had hoped to have wallet encryption ready for release, but more urgent fixes for existing clients were needed -- most notably block download problems were getting severe.  Wallet encryption is ready for testing at https://github.com/bitcoin/bitcoin/pull/352 for the git-savvy, and hopefully will follow shortly in the next release, v0.4.

Notable fixes in v0.3.24, and the main reasons for this release:

F1) Block downloads were failing or taking unreasonable amounts of time to complete, because the increased size of the block chain was bumping up against some earlier buffer-size DoS limits.

F2) Fix crash caused by loss/lack of network connection.

Notable changes in v0.3.24:

C1) DNS seeding enabled by default.

C2) UPNP enabled by default in the GUI client.  The percentage of bitcoin clients that accept incoming connections is quite small, and that is a problem.  This should help.  bitcoind, and unofficial builds, are unchanged (though we encourage use of "-upnp" to help the network!)

C3) Initial unit testing framework.  Bitcoin sorely needs automated tests, and this is a beginning.  Contributions welcome.

C4) Internal wallet code cleanup.  While invisible to an end user, this change provides the basis for v0.4's wallet encryption.
Win32, Linux, MacOSX and source releases for bitcoin v0.3.23 have been uploaded to
https://sourceforge.net/projects/bitcoin/files/Bitcoin/bitcoin-0.3.23/

This is another quick bugfix release, trying to deal with the influx of new bitcoin users.

Main items of note:

* P2P connect-to-node logic changed to reduce timeout a bit.  The network saw a huge influx of new users, who do not permit incoming connections.  This change is a short-term hack, to more quickly hunt for useful P2P connections.  Better "leaf node" logic is in the works, but this should let us limp along until then.  One may use -upnp to properly forward ports, and help the network.
* Transaction fee reduced to 0.0005 for new transactions
* Client will relay transactions with fees as low as 0.0001 BTC

This is largely a bugfix and TX fee schedule release.  We also hope to make 0.3.23 a quick release, to fix problems that the network has seen due to explosive growth in the past week.

Notable changes:
* Client will accept and relay TX's with 0.0005 BTC fee schedule (users still pay 0.01 BTC per kb, until next version)
* Non-standard transactions accepted on testnet
* Source code tree reorganized (prep for autotools build)
* Remove "Generate Coins" option from GUI, and remove 4way SSE miner.  Internal reference CPU miner remains available, but users are directed to external miners for best hash production.
* IRC is overflowing.  Client now bootstraps to channels #bitcoin00 - #bitcoin99
* DNS names now may be used with -addnode, -connect (requires -dns to enable)

RPC changes:
* 'listtransactions' adds 'from' param, for range queries
* 'move' may take account balances negative
* 'settxfee' added, to manually set TX fee
Binaries for Bitcoin version 0.3.21 are available at:
  https://sourceforge.net/projects/bitcoin/files/Bitcoin/bitcoin-0.3.21/

Changes and new features from the 0.3.20 release include:

* Universal Plug and Play support.  Enable automatic opening of a port for incoming connections by running bitcoin or bitcoind with the - -upnp=1 command line switch or using the Options dialog box.

* Support for full-precision bitcoin amounts.  You can now send, and bitcoin will display, bitcoin amounts smaller than 0.01.  However, sending fewer than 0.01 bitcoins still requires a 0.01 bitcoin fee (so you can send 1.0001 bitcoins without a fee, but you will be asked to pay a fee if you try to send 0.0001).

* A new method of finding bitcoin nodes to connect with, via DNS A records. Use the -dnsseed option to enable.

For developers, changes to bitcoin's remote-procedure-call API:

* New rpc command "sendmany" to send bitcoins to more than one address in a single transaction.

* Several bug fixes, including a serious intermittent bug that would sometimes cause bitcoind to stop accepting rpc requests. 

* -logtimestamps option, to add a timestamp to each line in debug.log.

* Immature blocks (newly generated, under 120 confirmations) are now shown in listtransactions.
Please checkout the git integration branch from:

https://github.com/bitcoin/bitcoin

... and help test.  The new features that need testing are:

* -nolisten : https://github.com/bitcoin/bitcoin/pull/11
* -rescan : scan block chain for missing wallet transactions
* -printtoconsole : https://github.com/bitcoin/bitcoin/pull/37
* RPC gettransaction details : https://github.com/bitcoin/bitcoin/pull/24
* listtransactions new features : https://github.com/bitcoin/bitcoin/pull/10

Bug fixes that also need testing:

* -maxconnections= : https://github.com/bitcoin/bitcoin/pull/42
* RPC listaccounts minconf : https://github.com/bitcoin/bitcoin/pull/27
* RPC move, add time to output : https://github.com/bitcoin/bitcoin/pull/21
* ...and several improvements to --help output.

This needs more testing on Windows!  Please drop me a quick private message, email, or IRC message if you are able to do some testing.  If you find bugs, please open an issue at:

https://github.com/bitcoin/bitcoin/issues
The maxsendbuffer bug (0.3.20.1 clients not being able to download the block chain from other 0.3.20.1 clients) was only going to get
worse as people upgraded, so I cherry-picked the bug fix and created a minor release yesterday.

The Amazon Machine Images I used to do the builds are available:

  ami-38a05251   Bitcoin-v0.3.20.2 Mingw    (Windows; Administrator password 'bitcoin development')
  ami-30a05259   Bitcoin_0.3.20.2 Linux32
  ami-8abc4ee3   Bitcoin_0.3.20.2 Linux64

(mac build will be done soon)

If you have already downloaded version 0.3.20.1, please either add this to your bitcoin.conf file:

  maxsendbuffer=10000
  maxreceivebuffer=10000

... or download the new version.
Never released or release notes were lost.
There's more work to do on DoS, but I'm doing a quick build of what I have so far in case it's needed, before venturing into more complex ideas.  The build for this is version 0.3.19.

- Added some DoS controls
As Gavin and I have said clearly before, the software is not at all resistant to DoS attack.  This is one improvement, but there are still more ways to attack than I can count.  

I'm leaving the -limitfreerelay part as a switch for now and it's there if you need it.

- Removed "safe mode" alerts
"safe mode" alerts was a temporary measure after the 0.3.9 overflow bug.  We can say all we want that users can just run with "-disablesafemode", but it's better just not to have it for the sake of appearances.  It was never intended as a long term feature.  Safe mode can still be triggered by seeing a longer (greater total PoW) invalid block chain.
Changes:
* Fixed a wallet.dat compatibility problem if you downgraded from 0.3.17 and then upgraded again
* IsStandard() check to only include known transaction types in blocks
* Jgarzik's optimisation to speed up the initial block download a little

The main addition in this release is the Accounts-Based JSON-RPC commands that Gavin's been working on (more details at http://www.bitcoin.org/smf/index.php?topic=1886.0).  
* getaccountaddress
* sendfrom
* move
* getbalance
* listtransactions
Version 0.3.17 is now available.

Changes:
* new getwork, thanks m0mchil
* added transaction fee setting in UI options menu
* free transaction limits
* sendtoaddress returns transaction id instead of "sent"
* getaccountaddress <account>

The UI transaction fee setting was easy since it was still there from 0.1.5 and all I had to do was re-enable it.

The accounts-based commands: move, sendfrom and getbalance <account> will be in the next release.  We still have some more changes to make first.
Never released.
* paytxfee switch is now per KB, so it adds the correct fee for large transactions
* sending avoids using coins with less than 6 confirmations if it can
* BitcoinMiner processes transactions in priority order based on age of dependencies
* make sure generation doesn't start before block 74000 downloaded
* bugfixes by Dean Gores
* testnet, keypoololdest and paytxfee added to getinfo
Version 0.3.14 is now available
http://sourceforge.net/projects/bitcoin/files/Bitcoin/bitcoin-0.3.14/

Changes:
* Key pool feature for safer wallet backup
Gavin Andresen:
* TEST network mode with switch -testnet
* Option to use SSL for JSON-RPC connections on unix/osx
* validateaddress RPC command
eurekafag:
* Russian translation
Version 0.3.13 is now available.  You should upgrade to prevent potential problems with 0/unconfirmed transactions.  Note: 0.3.13 prevents problems if you haven't already spent a 0/unconfirmed transaction, but if that already happened, you need 0.3.13.2.

Changes:
* Don't count or spend payments until they have 1 confirmation.
* Internal version number from 312 to 31300.
* Only accept transactions sent by IP address if -allowreceivebyip is specified.
* Dropped DB_PRIVATE Berkeley DB flag.
* Fix problem sending the last cent with sub-cent fractional change.
* Auto-detect whether to use 128-bit 4-way SSE2 on Linux.
Gavin Andresen:
* Option -rpcallowip= to accept json-rpc connections from another machine.
* Clean shutdown on SIGTERM on Linux.

(Thanks Laszlo for the Mac OSX build!)

Note:
The SSE2 auto-detect in the Linux 64-bit version doesn't work with AMD in 64-bit mode.  Please try this instead and let me know if it gets it right:

You can still control the SSE2 use manually with -4way and -4way=0.

Version 0.3.13.2 (SVN rev 161) has improvements for the case where you already had 0/unconfirmed transactions that you might have already spent.  Here's a Windows build of it:
Version 0.3.12 is now available.

Features:
* json-rpc errors return a more standard error object. (thanks to Gavin Andresen)
* json-rpc command line returns exit codes.
* json-rpc "backupwallet" command.
* Recovers and continues if an exception is caused by a message you received.  Other nodes shouldn't be able to cause an exception, and it hasn't happened before, but if a way is found to cause an exception, this would keep it from being used to stop network nodes.

If you have json-rpc code that checks the contents of the error string, you need to change it to expect error objects of the form {"code":<number>,"message":<string>}, which is the standard.  See this thread:
http://www.bitcoin.org/smf/index.php?topic=969.0

