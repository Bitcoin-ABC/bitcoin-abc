---
layout: specification
title: UAHF Technical Specification
category: spec
date: 2017-07-24
activation: 1501590000
version: 1.6
---

## Introduction

This document describes proposed requirements for a block size Hard Fork (HF).

BUIP 55 specified a block height fork. This UAHF specification is
inspired by the idea of a flag day, but changed to a time-based fork due
to miner requests. It should be possible to change easily to a height-based
fork - the sense of the requirements would largely stay the same.


## Definitions

MTP: the "median time past" value of a block, calculated from its nTime
value, and the nTime values of its up to 10 immediate ancestors.

"activation time": once the MTP of the chain tip is equal to or greater
than this time, the next block must be a valid fork block. The fork block
and subsequent blocks built on it must satisfy the new consensus rules.

"fork block": the first block built on top of a chain tip whose MTP is
greater than or equal to the activation time.

"fork EB": the user-specified value that EB shall be set to at
activation time. EB can be adjusted post-activation by the user.

"fork MG": the user-specified value that MG shall be set to at activation
time. It must be > 1MB. The user can adjust MG to any value once the
fork has occurred (not limited to > 1MB after the fork).

"Large block" means a block satisfying 1,000,000 bytes < block
size <= EB, where EB is as adjusted by REQ-4-1 and a regular block
is a block up to 1,000,000 bytes in size.

"Core rules" means all blocks <= 1,000,000 bytes (Base block size).

"Extended BU tx/sigops rules" means the existing additional consensus rules (1) and
(2) below, as formalized by BUIP040 [1] and used by the Bitcoin Unlimited
client's excessive checks for blocks larger than 1MB, extended with rule
(3) below:
1. maximum sigops per block is calculated based on the actual size of
a block using
max_block_sigops = 20000 * ceil((max(blocksize, 1000000) / 1000000))
2. maximum allowed size of a single transaction is 1,000,000 bytes (1MB)
3. maximum allowed number of sigops for a single transaction is 20k .

NOTE 1: In plain English, the maximum allowed sigops per block is
20K sigops per the size of the block, rounded up to nearest integer in MB.
i.e. 20K if <= 1MB, 40K for the blocks > 1MB and up to 2MB, etc.


## Requirements

### REQ-1 (fork by default)

The client (with UAHF implementation) shall default to activating
a hard fork with new consensus rules as specified by the remaining
requirements.

RATIONALE: It is better to make the HF active by default in a
special HF release version. Users have to download a version capable
of HF anyway, it is more convenient for them if the default does not
require them to make additional configuration.

NOTE 1: It will be possible to disable the fork behavior (see
REQ-DISABLE)


### REQ-2 (configurable activation time)

The client shall allow a "activation time" to be configured by the user,
with a default value of 1501590000 (epoch time corresponding to Tue
1 Aug 2017 12:20:00 UTC)

RATIONALE: Make it configurable to adapt easily to UASF activation
time changes.

NOTE 1: Configuring a "activation time" value of zero (0) shall disable
any UAHF hard fork special rules (see REQ-DISABLE)


### REQ-3 (fork block must be > 1MB)

The client shall enforce a block size larger than 1,000,000 bytes
for the fork block.

RATIONALE: This enforces the hard fork from the original 1MB
chain and prevents a re-organization of the forked chain to
the original chain.


### REQ-4-1 (require "fork EB" configured to at least 8MB at startup)

If UAHF is not disabled (see REQ-DISABLE), the client shall enforce
that the "fork EB" is configured to at least 8,000,000 (bytes) by raising
an error during startup requesting the user to ensure adequate configuration.

RATIONALE: Users need to be able to run with their usual EB prior to the
fork (e.g. some are running EB1 currently). The fork code needs to adjust
this EB automatically to a > 1MB value. 8MB is chosen as a minimum since
miners have indicated in the past that they would be willing to support
such a size, and the current network is capable of handling it.


### REQ-4-2 (require user to specify suitable *new* MG at startup)

If UAHF is not disabled (see REQ-DISABLE), the client shall require
the user to specify a "fork MG" (mining generation size) greater than
1,000,000 bytes.

RATIONALE: This ensures a suitable MG is set at the activation time so
that a mining node would produce a fork block compatible with REQ-3.
It also forces the user (miner) to decide on what size blocks they want to
produce immediately after the fork.

NOTE 1: The DEFAULT_MAX_GENERATED_BLOCK_SIZE in the released client needs
to remain 1,000,000 bytes so that the client will not generate invalid
blocks before the fork activates. At activation time, however, the "fork MG"
specified by the user (default: 2MB) will take effect.


### REQ-5 (max tx / max block sigops rules for blocks > 1 MB)

Blocks larger than 1,000,000 shall be subject to "Extended BU tx/sigops rules"
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

Once the fork has activated, transactions consisting exclusively of a single OP_RETURN output, followed by a single minimally-coded data push with the specific magic data value of

    Bitcoin: A Peer-to-Peer Electronic Cash System

(46 characters, including the single spaces separating the words, and
without any terminating null character) shall be considered invalid until
block 530,000 inclusive.

RATIONALE: (DEPRECATED - see NOTE 2) To give users on the legacy chain (or other fork chains)
an opt-in way to exclude their transactions from processing on the UAHF
fork chain. The sunset clause block height is calculated as approximately
1 year after currently planned UASF activation time (Aug 1 2017 00:00:00 GMT),
rounded down to a human friendly number.

NOTE 1: Transactions with such OP_RETURNs shall be considered valid again
for block 530,001 and onwards.

NOTE 2: With the changes in v1.6 of this specification, mandatory use
of SIGHASH_FORKID replay protection on UAHF chain makes the use of this
opt-out protection unnecessary. Clients should nevertheless implement this
requirement, as removing it would constitute a hard fork vis-a-vis the
existing network. The sunset clause in this requirement will take care
of its expiry by itself.


### REQ-6-2 (mandatory signature shift via hash type)

Once the fork has activated, a transaction shall be deemed valid only if
the following are true in combination:
- its nHashType has bit 6 set (SIGHASH_FORKID, mask 0x40)
- a magic 'fork id' value is added to the nHashType before the hash is
  calculated (see note 4)
- it is digested using the new algorithm described in REQ-6-3

RATIONALE: To provide strong protection against replay of existing
transactions on the UAHF chain, only transactions signed with the new
hash algorithm and having SIGHASH_FORKID set will be accepted, by consensus.

NOTE 1: It is possible for other hard forks to allow SIGHASH_FORKID-protected
transactions on their chain by implementing a compatible signature.
However, this does require a counter hard fork by legacy chains.

NOTE 2: (DEPRECATED) ~~The client shall still accept transactions whose signatures~~
~~verify according to pre-fork rules, subject to the additional OP_RETURN~~
~~constraint introduced by REQ-6-1.~~

NOTE 3: (DEPRECATED) ~~If bit 6 is not set, only the unmodified nHashType will be used~~
~~to compute the hash and verify the signature.~~

NOTE 4: The magic 'fork id' value used by UAHF-compatible clients is zero.
This means that the change in hash when bit 6 is set is effected only by
the adapted signing algorithm (see REQ-6-3).

NOTE 5: See also REQ-6-4 which introduces a requirement for use of
SCRIPT_VERIFY_STRICTENC.


### REQ-6-3 (use adapted BIP143 hash algorithm for protected transactions)

Once the fork has activated, any transaction that has bit 6 set in its
hash type shall have its signature hash computed using a minimally revised
form of the transaction digest algorithm specified in BIP143.

RATIONALE: see Motivation section of BIP143 [2].

NOTE 1: refer to [3] for the specificaton of the revised transaction
digest based on BIP143. Revisions were made to account for non-Segwit
deployment.


### REQ-6-4 (mandatory use of SCRIPT_VERIFY_STRICTENC)

Once the fork has activated, transactions shall be validated with
SCRIPT_VERIFY_STRICTENC flag set.

RATIONALE: Use of SCRIPT_VERIFY_STRICTENC also ensures that the
nHashType is validated properly.

NOTE: As SCRIPT_VERIFY_STRICTENC is not clearly defined by BIP,
implementations seeking to be compliant should consult the Bitcoin C++
source code to emulate the checks enforced by this flag.


### REQ-7 Difficulty adjustement in case of hashrate drop

In case the MTP of the tip of the chain is 12h or more after the MTP 6 block
before the tip, the proof of work target is increased by a quarter, or 25%,
which corresponds to a difficulty reduction of 20% .

RATIONALE: The hashrate supporting the chain is dependent on market price and
hard to predict. In order to make sure the chain remains viable no matter what
difficulty needs to adjust down in case of abrupt hashrate drop.

### REQ-DISABLE (disable fork by setting fork time to 0)

If the activation time is configured to 0, the client shall not enforce
the new consensus rules of UAHF, including the activation of the fork,
the size constraint at a certain time, and the enforcing of EB/AD
constraints at startup.

RATIONALE: To make it possible to use such a release as a compatible
client with legacy chain / i.e. to decide to not follow the HF on one's
node / make a decision at late stage without needing to change client.


### OPT-SERVICEBIT (NODE_BITCOIN_CASH service bit)

A UAHF-compatible client should set service bit 5 (value 0x20).

RATIONALE: This service bit allows signaling that the node is a UAHF
supporting node, which helps DNS seeders distinguish UAHF implementations.

NOTE 1: This is an optional feature which clients do not strictly have to
implement.

NOTE 2: This bit is currently referred to as NODE_BITCOIN_CASH and displayed
as "CASH" in user interfaces of some Bitcoin clients (BU, ABC).


## References

[1] https://bitco.in/forum/threads/buip040-passed-emergent-consensus-parameters-and-defaults-for-large-1mb-blocks.1643/

[2] https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki#Motivation

[3] [Digest for replay protected signature verification accross hard forks](replay-protected-sighash.md)

[4] uahf-test-plan.md


END
