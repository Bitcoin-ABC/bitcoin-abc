# Avalanche

Ths document describes technical details about the Avalanche protocol. Its scope is limited to
user-facing data structures and network messages.
It does not cover internal implementation details.

## Primitives

### ProofId

A `ProofId` is a hash (`uint256`)  of a [`LimitedProofId`](.#LimitedProofId) and a `Proof`'s master
key. It uniquely identifies a [`Proof`](.#Proof).

It is sent in `CInv` messages with the `MSG_AVA_PROOF` type, and can be computed from the data
included in a [`Delegation`](.#Delegation).

### LimitedProofId

A `LimitedProofId` is a hash (`uint256`) of a [Proof's](.#Proof) data, excluding the proof master key.
It is included in a [`Delegation`](.#Delegation) together with the proof's master key, to allow
to compute the [`ProofId`](.#ProofId).

### Proof

A `Proof` is a data structure containing information on stakes used by an avalanche peer and a
master key that the peer can use to sign or encrypt messages when participating in the Avalanche
protocol.

It is uniquely identified by a [`ProofId`](.#ProofId)

### DelegationId

A `DelegationId` is a hash (`uint256`) of a [`Delegation`](.#Delegation). It is mainly used when
adding a level to an existing delegation. It is concatenated with the new public key being
added to the delegation, to be hashed and signed by the key from the previous level.

### Delegation

A `Delegation` is a data structure that transfers control over a proof from the proof's master key
to some other public key. It can have multiple levels, meaning a child key can itself transfer the
control to child key.

Serialized format:

| Bytes  | Name           | Data type          | Description                         |
|--------|----------------|--------------------|-------------------------------------|
| 32     | limitedProofId | uint256            | [see description](.#LimitedProofId) |
| Varies | proofMaster    | CPubKey            |                                     |
| 32     | dgid           | uint256            | [see description](.#DelegationId)   |
| Varies | levels         | std::vector<Level> | Delegation level                    |

A delegation level contains a public key and a signature by the previous level's key.
The signed data is a hash of the new public key and the delegation id. Note that adding a new level
will change the global delegation ID. Each new level uses the previous delegation id for its signature,
i.e. the delegation ID of the Delegation that would contain only the parent levels.

Serialized level format:

| Bytes  | Name    | Data type               | Description       |
|--------|---------|-------------------------|-------------------|
| Varies | pubkey  | CPubKey                 |                   |
| 64     | sig     | std::array<uint8_t, 64> | Schnorr signature |

A delegation with no levels (empty delegation) signifies that a node intends to directly use the
proof's master key for signing avalanche messages.

A delegation advertises the proof that the sender intends to use for participating in the Avalanche
protocol. Other peers will assume that the sender of the delegation owns the corresponding proof,
and will request it with a `GETDATA` message if they don't already have it.

## Network messages

### AVAHELLO

The `AVAHELLO` message is used in the handshake sequence, when two Avalanche enabled nodes first meet.
It is sent in response to a `VERACK` message, if the sender's `NODE_AVALANCHE` service flag is set.

| Bytes  | Name       | Data type               | Description                     |
|--------|------------|-------------------------|---------------------------------|
| Varies | delegation | Delegation              | [see description](.#Delegation) |
| 64     | signature  | std::array<uint8_t, 64> | Schnorr signature               |


### AVAPROOF

The `AVAPROOF` message is used to send a proof to a peer, in response to a `GETDATA` message.
Its payload is a [`Proof`](.#Proof).

| Bytes  | Name  | Data type  | Description                |
|--------|-------|------------|----------------------------|
| Varies | proof | Proof      | [see description](.#Proof) |

### AVAPOLL

The `AVAPOLL` message is used to poll Avalanche peers about inventories.

| Bytes  | Name   | Data type         | Description                        |
|--------|--------|-------------------|------------------------------------|
| 8      | round  | uint64_t          |                                    |
| Varies | nCount | compactSize       | Number of inventories in this poll |
| Varies | invs   | std::vector<CInv> |                                    |

### AVARESPONSE

The `AVARESPONSE` message is used in reply to an [`AVAPOLL`](.#AVAPOLL) message.
It contains a signature to control the identity of the sending Avalanche peer.

The response

| Bytes  | Name     | Data type               | Description       |
|--------|----------|-------------------------|-------------------|
| Varies | response | Response                |                   |
| 64     | sig      | std::array<uint8_t, 64> | Schnorr signature |

A `Response` contains the following data:

| Bytes  | Name     | Data type         | Description  |
|--------|----------|-------------------|--------------|
| 8      | round    | uint64_t          |              |
| 4      | coolDown | uint32_t          |              |
| Varies | votes    | std::vector<Vote> |              |

An individual vote is serialized the following way:

| Bytes  | Name     | Data type         | Description                               |
|--------|----------|-------------------|-------------------------------------------|
| 4      | error    | uint32_t          | Error code (see below)                    |
| 32     | hash     | uint256           | Inventory id of the object being voted on |

The result of the vote is determined from the error code. If the error code is 0, there is
no error and therefore the vote is yes. If there is an error,the most significant
bit is checked to decide if the vote is a no (for instance, the block is invalid) or if
the vote is inconclusive.
