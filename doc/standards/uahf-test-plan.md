---
layout: specification
title: UAHF Test Plan
category: spec
date: 2017-06-14
activation: 1501590000
version: 1.0
---

## Introduction

This document is a rough draft of tests planned for UAHF as described
in the UAHF Technical Specification [1].

Test cases listed below are currenty incomplete w.r.t. the revised
technical specification - this document is very much under construction.


## Functional Tests

### TEST-1

If UAHF is disabled a large block is considered to break core rules,
as is presently the case.


### TEST-2

If UAHF is disabled, a regular block is accepted at or after the
activation time (as determined by MTP(block.parent) without being
considered invalid.


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
validation times above and beyond the standard expected if UAHF
is not enabled.


### TEST-11

Test that linear scaling of 20,000 sigops / MB works for block
sizes > 1MB (rounding block size up to nearest MB) (ref. BUIP040).


### TEST-12

(similar to (TEST-9), but test interoperability of datadir with other
clients.)

Test what happens when the unmodified BU / Core / other clients are
used on a datadir where the UAHF client has been run. Should
test again data from disabled (Core rules data, should be fine) ,
and enabled (big block data stored - may need to rebuild DB? or
provide tool to truncate the data back to pre-fork block?)


## References

[1] https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/uahf-technical-spec.md


END
