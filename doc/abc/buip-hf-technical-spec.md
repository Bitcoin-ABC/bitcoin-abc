# BUIP-HF Technical Specification


## Introduction

This document described proposed requirements and design for a block size
Hard Fork (HF).

BUIP 55 specified a block height fork. This BUIP-HF specification is
inspired by the idea of a flag day, but changed to a time-based fork due
to miner requests. It should be possible to change easily to a height-based
fork - the sense of the requirements would largely stay the same.


## Definitions

MTP: the "median time past" value of a block, calculated from the
nTime values of its past up to 11 ancestors, as obtained by the
GetMedianTimePast(block.parent) call.

"activation time": a block whose MTP is after this time
shall comply with the new consensus rules introduced by this BUIP.

"fork block": the first block in the active chain whose nTime is past the
activation time.

"fork EB": the user-specified value that EB shall be set to at
activation time. EB can be adjusted post-activation by the user.

"fork MG": the user-specified value that MG shall be set to at activation
time. It must be > 1MB. The user can adjust MG to any value once the
fork has occurred (not limited to > 1MB after the fork).

"Large block" means a block satisfying 1,000,000 bytes < block
size <= EB, where EB is as adjusted by REQ-4-1 and a regular block
is a block up to 1,000,000 bytes in size.

"Core rules" means all blocks <= 1,000,000 bytes (Base block size).

"BU tx/sigops rules" means the existing additional consensus rules (1) and
(2) below, as formalized by BUIP040 [1] and used by the Bitcoin Unlimited
client's excessive checks for blocks larger than 1MB:
1. maximum sigops per block is calculated based on the actual size of
a block using
max_block_sigops = 20000 * ceil((max(blocksize, 1000000) / 1000000))
2. maximum allowed size of a single transaction is 1,000,000 bytes (1MB)
3. maximum allowed number of sigops for a single transaction is 20k .

NOTE 1: In plain English, the maximum allowed sigops per block is
20K sigops per the size of the block, rounded up to nearest integer in MB.
i.e. 20K if <= 1MB, 40K for the blocks > 1MB and up to 2MB, etc.

NOTE 2: BU treats both rules (1) and (2) as falling under the Emergent
Consensus rules (AD). Other clients may choose to implement them as
firm rules at their own risk.


## Requirements

### REQ-1 (fork by default)

The client (with BUIP-HF implementation) shall default to activating
a hard fork with new consensus rules as specified by the remaining
requirements.

RATIONALE:: It is better to make the HF active by default in a
special HF release version. Users have to download a version capable
of HF anyway, it is more convenient for them if the default does not
require them to make additional configuration.

NOTE 1: It will be possible to disable the fork behavior (see
REQ-DISABLE)


### REQ-2 (configurable activation time)

The client shall allow a "activation time" to be configured by the user,
with a default value of 1501545600 (epoch time corresponding to Tue
1 Aug 2017 00:00:00 UTC)

RATIONALE: Make it configurable to adapt easily to UASF activation
time changes.

NOTE 1: Configuring a "activation time" value of zero (0) shall disable
any BUIP-HF hard fork special rules (see REQ-DISABLE)


### REQ-3 (fork block must be > 1MB)

The client shall enforce a block size larger than 1,000,000 bytes
for the fork block.

RATIONALE: This enforces the hard fork from the original 1MB
chain and prevents a re-organization of the forked chain to
the original chain.


### REQ-4-1 (require "fork EB" configured to at least 8MB at startup)

If BUIP-HF is not disabled (see REQ-DISABLE), the client shall enforce
that the "fork EB" is configured to at least 8,000,000 (bytes) by raising
an error during startup requesting the user to ensure adequate configuration.

RATIONALE: Users need to be able to run with their usual EB prior to the
fork (e.g. some are running EB1 currently). The fork code needs to adjust
this EB automatically to a > 1MB value. 8MB is chosen as a minimum since
miners have indicated in the past that they would be willing to support
such a size, and the current network is capable of handling it.


### REQ-4-2 (require user to specify suitable *new* MG at startup)

If BUIP-HF is not disabled (see REQ-DISABLE), the client shall require
the user to specify a "fork MG" (mining generation size) greater than
1,000,000 bytes.

RATIONALE: This ensures a suitable MG is set at the activation time so
that a mining node would produce a fork block compatible with REQ-3.
It also forces the user (miner) to decide on what size blocks they want to
produce immediately after the fork.

NOTE 1: The DEFAULT_MAX_GENERATED_BLOCK_SIZE in the released client needs
to remain 1,000,000 bytes so that the client will not generate invalid
blocks before the fork activates. At activation time, however, the "fork MG"
specified by the user (default: 8MB) will take effect.


### REQ-5 (max tx / max block sigops rules for blocks > 1 MB)

Blocks larger than 1,000,000 shall be subject to "BU tx/sigops rules"
as follows:

1. maximum sigops per block shall be calculated based on the actual size of
a block using
`max_block_sigops = 20000 * ceil((max(blocksize_bytes, 1000000) / 1000000))`

2. maximum allowed size of a single transaction shall be 1,000,000 bytes

NOTE 1: Blocks up to and including 1,000,000 bytes in size shall be subject
to existing pre-fork Bitcoin consensus rules.

NOTE 2: Transactions exceeding 100,000 bytes (100KB) shall remain
non-standard after the activation time, meaning they will not be relayed.

NOTE 3: BU treats both rules (1) and (2) as falling under the Emergent
Consensus rules (AD). Other clients may choose to implement them as
firm rules at their own risk.


### REQ-6-1 (disallow special OP_RETURN-marked transactions with sunset clause)

Once the fork has activated, transactions containing an OP_RETURN output
with a specific magic data value shall be considered invalid until
block 530,000 inclusive.

RATIONALE: To give users on the legacy chain (or other fork chains)
an opt-in way to exclude their transactions from processing on the BUIP-HF
fork chain. The sunset clause block height is calculated as approximately
1 year after currently planned UASF activation time (Aug 1 2017 00:00:00 GMT),
rounded down to a human friendly number.

NOTE: Transactions with such OP_RETURNs shall be considered valid again
for block 530,001 and onwards.


### REQ-6-2 (opt-in signature shift via hash type)

Once the fork has activated, a transaction shall not be deemed invalid if
the following are true in combination:
- the nHashType has bit 6 set (mask 0x40)
- adding a magic 'fork id' value to the nHashType before the hash is
  calculated allows a successful signature verification as per REQ-6-3

RATIONALE: To give users on the BUIP-HF chain an opt-in way to encumber
replay of their transactions to the legacy chain (and other forks which may
consider such transactions invalid).

NOTE 1: It is possible for other hard forks to defeat this protection by
implementing a compatible signature check that accepts transactions
signed in this special way. However, this does require a counter hard fork.

NOTE 2: The client shall still accept transactions whose signatures
verify according to pre-fork rules, subject to the additional OP_RETURN
constraint introduced by REQ-6-1.

NOTE 3: If bit 6 is not set, only the unmodified nHashType will be used
to compute the hash and verify the signature.


### REQ-6-3 (use adapted BIP143 hash algorithm for protected transactions)

Once the fork has activated, any transaction that has bit 6 set in its
hash type shall have its signature hash computed using a minimally revised
form of the transaction digest algorithm specified in BIP143.

RATIONALE: see Motivation section of BIP143 [2].

NOTE 1: refer to [3] for the specificaton of the revised transaction
digest based on BIP143. Revisions were made to account for non-Segwit
deployment.


### REQ-DISABLE (disable fork by setting fork time to 0)

If the activation time is configured to 0, the client shall not enforce
the new consensus rules of BUIP-HF, including the activation of the
fork, the size constraint at a certain time, and the enforcing of EB/AD
constraints at startup.

RATIONALE: To make it possible to use such a release as a compatible
client with legacy chain / i.e. to decide to not follow the HF on one's
node / make a decision at late stage without needing to change client.


## Test Plan

What follows are rough descriptions of test cases.

NOTE: ** wording for excessive in 3, 4, 5, and invalid in 6, 7,
needs to be considered carefully.  I recommend BUIP 55 forcing EB
1MB up to activation, and to be max(8MB, user EB) at activation, for
simplicity.  Similarly for MG.  If user doesn't like that they can
just disable it.  (Consider: If MG is bumped then 4MB is sufficient
for fork block and a while after.

### TEST-1

If BUIP 55 is disabled a large block is considered to break
core rules, as is presently the case.


### TEST-2

If BUIP 55 is disabled, a regular block  is accepted at or
after the activation time (as determined by MTP(block.parent)
without being considered invalid.


### TEST-3

If enabled, a large block is considered excessive if all blocks
have time < activation time.


### TEST-4

If enabled, a large block B is not considered excessive if
MTP(B.parent) >= activation time


### TEST-5

If enabled, a large block B is not considered excessive if
MTP(B.parent) < activation time, provided a prior block A has
MTP(A.parent) >= activation time.


### TEST-6

If enabled, a regular block R that is the first such that
MTP(R.parent) >= activation time is considered invalid (satisfy REQ-3).


### TEST-7

If enabled, a regular block R that is not the first such that
MTP(R.parent) >= activation time is considered valid.


### TEST-8

A small block more-work chain does not get re-orged to from a big
block chain after activation has kicked in.


### TEST-9

Test that enabling after being disabled renders a small chain going
past activation invalid that was previously valid owing to it being
disabled.  And vice versa (enabled -> disabled).


### TEST-10

If enabled, if a large but < 8MB block is produced, ensure that the
degenerate case of sigops heavy instructions does not unduly affect
validation times above and beyond the standard expected if BUIP-HF
is not enabled.


### TEST-11

Test that linear scaling of 20,000 sigops / MB works for block
sizes > 1MB (rounding block size up to nearest MB) (ref. BUIP040).


### TEST-12

(similar to (TEST-9), but test interoperability of datadir with other
clients.)

Test what happens when the unmodified BU / Core / other clients are
used on a datadir where the BUIP 55 client has been run. Should
test again data from disabled (Core rules data, should be fine) ,
and enabled (big block data stored - may need to rebuild DB? or
provide tool to truncate the data back to pre-fork block?)


## References

[1] https://bitco.in/forum/threads/buip040-passed-emergent-consensus-parameters-and-defaults-for-large-1mb-blocks.1643/

[2] https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki#Motivation

[3] [Digest for replay protected signature verification accross hard forks](replay-protected-sighash.md)


END
