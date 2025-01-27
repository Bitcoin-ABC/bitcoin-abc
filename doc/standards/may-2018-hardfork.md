---
layout: specification
title: May 2018 Hardfork Specification
category: spec
date: 2018-04-09
activation: 1526400000
version: 1.1
---

## Summary

When the median time past[1] of the most recent 11 blocks (MTP-11) is greater than or equal to UNIX timestamp 1526400000 Bitcoin Cash will execute a hardfork according to this specification. Starting from the next block these consensus rules changes will take effect:

* Blocksize increase to 32,000,000 bytes
* Re-enabling of several opcodes

The following are not consensus changes, but are recommended changes for Bitcoin Cash implementations:

* Automatic replay protection for future hardforks
* Increase OP_RETURN relay size to 223 total bytes

## Blocksize increase

The blocksize hard capacity limit will be increased to 32MB (32000000 bytes).

## OpCodes

Several opcodes will be re-enabled per [may-2018-reenabled-opcodes](may-2018-reenabled-opcodes.md)

## Automatic Replay Protection

When the median time past[1] of the most recent 11 blocks (MTP-11) is greater than or equal to UNIX timestamp 1542300000 (November 2018 hardfork) Bitcoin Cash full nodes implementing the May 2018 consensus rules SHOULD enforce the following change:

 * Update `forkid`[1] to be equal to 0xFF0001.  ForkIDs beginning with 0xFF will be reserved for future protocol upgrades.

This particular consensus rule MUST NOT be implemented by Bitcoin Cash wallet software.

[1] The `forkId` is defined as per the [replay protected sighash](replay-protected-sighash.md) specification.
