# avalanche-lib-wasm

WebAssembly library for eCash Avalanche proof, stake, and delegation management.

This is the core Rust library that compiles to both native code and WebAssembly.

This library provides a Rust implementation of eCash Avalanche proofs that compiles to WebAssembly, enabling proof creation and verification in web browsers and Node.js applications.

## Features

- **Proof Building**: Create avalanche proofs from UTXOs with the `ProofBuilder` class
- **Stake Management**: Create and sign individual stakes for inclusion in proofs
- **Delegation Management**: Create and manage proof delegations for key rotation
- **Verification**: Verify proof signatures, stake commitments, and delegations
- **Serialization**: Convert proofs and delegations to/from hex strings for network transmission
- **WebAssembly**: Runs in browsers and Node.js with high performance
- **Type Safety**: Full TypeScript bindings for web development

## Architecture

This library is based on the C++ implementation in Bitcoin ABC (`src/avalanche/proofbuilder.h`) and provides:

- **Core Types**: `Hash256`, `OutPoint`, `Script`, `SchnorrSignature`
- **Stake Types**: `Stake`, `SignedStake`, `StakeCommitment`
- **Proof Types**: `Proof`, `ProofBuilder`
- **Delegation Types**: `Delegation`, `DelegationBuilder`, `DelegationId`, `DelegationLevel`
- **Cryptography**: Schnorr signatures using `ecash-secp256k1`

## Building

### Prerequisites

- Rust 1.76.0 or later
- `wasm-pack` or `wasm-bindgen-cli`
- `wasm-opt` (from binaryen)

### Build Commands

```bash
# Build the WebAssembly module
./build-wasm.sh

# Or build manually
cargo build --profile=release-wasm --target=wasm32-unknown-unknown
```

This generates both browser and Node.js compatible bindings in `../avalanche-lib/src/ffi/`.

## Usage

```rust
use avalanche_lib_wasm::{ProofBuilder, Script, Hash256, OutPoint};
use ecash_secp256k1::{Secp256k1, SecretKey};

// Create a proof builder
let secp = Secp256k1::new();
let (master_secret, _) = secp.generate_keypair(&mut rand::thread_rng());
let payout_script = Script::from_hex("76a914...88ac").unwrap();

let mut builder = ProofBuilder::new(
    1,              // sequence
    1234567890,     // expiration_time
    master_secret,  // master_secret_key
    payout_script,  // payout_script
);

// Add a UTXO stake
let (stake_secret, _) = secp.generate_keypair(&mut rand::thread_rng());
let txid = TxId::from_hex("abc123...").unwrap();
let outpoint = OutPoint::new(txid, 0);

builder.add_utxo(
    outpoint,
    10000000000,  // 100 XEC in satoshis
    100,          // height
    false,        // iscoinbase
    stake_secret, // private_key
).unwrap();

// Build the proof
let proof = builder.build().unwrap();
println!("Proof ID: {}", proof.proof_id().to_hex());
println!("Proof hex: {}", proof.to_hex());

// Create a delegation for the proof
use avalanche_lib_wasm::{DelegationBuilder};

let mut delegation_builder = DelegationBuilder::from_proof(&proof).unwrap();

// Add a delegation level (delegate to another key)
let (delegated_secret, _) = secp.generate_keypair(&mut rand::thread_rng());
let delegated_pubkey = delegated_secret.public_key(&secp).serialize();

delegation_builder.add_level(
    &master_secret.secret_bytes(),  // Current key signs
    &delegated_pubkey,              // Delegate to this key
).unwrap();

// Build the delegation
let delegation = delegation_builder.build().unwrap();
println!("Delegation ID: {}", delegation.delegation_id().to_hex());
```

## API Reference

### ProofBuilder

The main class for building avalanche proofs.

```typescript
class ProofBuilder {
    constructor(
        sequence: number,
        expirationTime: number,
        masterSecretKey: SecretKey,
        payoutScript: Script,
    );

    addUtxo(
        utxo: OutPoint,
        amount: number,
        height: number,
        isCoinbase: boolean,
        privateKey: SecretKey,
    ): boolean;

    stakeCount(): number;
    totalStakedAmount(): number;
    build(): Proof;
    getLimitedProofId(): Hash256;
    getProofId(): Hash256;
}
```

### Proof

Represents a complete avalanche proof.

```typescript
class Proof {
    sequence(): number;
    expirationTime(): number;
    masterPubkey(): PublicKey;
    signedStakes(): SignedStake[];
    payoutScript(): Script;
    signature(): SchnorrSignature;
    proofId(): Hash256;
    limitedProofId(): Hash256;
    totalStakedAmount(): number;
    score(): number;
    stakeCount(): number;
    verify(): boolean;
    verifyProofSignature(): boolean;
    serialize(): Uint8Array;
    toHex(): string;
}
```

### Stake

Represents a single UTXO stake.

```typescript
class Stake {
    constructor(
        utxo: OutPoint,
        amount: number,
        height: number,
        isCoinbase: boolean,
        pubkey: PublicKey,
    );

    utxo(): OutPoint;
    amount(): number;
    height(): number;
    isCoinbase(): boolean;
    pubkey(): PublicKey;
    stakeId(): Hash256;
    getHash(commitment: StakeCommitment): Hash256;
    serialize(): Uint8Array;
}
```

### SignedStake

A stake with its signature.

```typescript
class SignedStake {
    constructor(stake: Stake, signature: SchnorrSignature);

    static createSigned(
        stake: Stake,
        privateKey: SecretKey,
        commitment: StakeCommitment,
    ): SignedStake;

    stake(): Stake;
    signature(): SchnorrSignature;
    verify(commitment: StakeCommitment): boolean;
    serialize(): Uint8Array;
}
```

### Delegation

Represents a proof delegation that allows transferring control from the master key to other keys.

```typescript
class Delegation {
    constructor(
        limitedProofId: Hash256,
        proofMaster: Uint8Array,
        levels: DelegationLevel[],
    );

    limitedProofId(): Hash256;
    proofMasterBytes(): Uint8Array;
    delegationId(): DelegationId;
    delegationLevels(): DelegationLevel[];
    verify(): boolean;
    serialize(): Uint8Array;

    static deserialize(data: Uint8Array): Delegation;
}
```

### DelegationBuilder

Builder for creating signed delegations.

```typescript
class DelegationBuilder {
    constructor(limitedProofId: Hash256, proofMaster: Uint8Array);

    // Static factory methods (matches C++ API)
    static fromProof(proof: Proof): DelegationBuilder;
    static fromDelegation(delegation: Delegation): DelegationBuilder;

    addLevel(delegatorSecretKey: Uint8Array, delegatedPubkey: Uint8Array): void;

    build(): Delegation;
}
```

### DelegationId

Unique identifier for a delegation.

```typescript
class DelegationId {
    static fromHex(hex: string): DelegationId;
    toHex(): string;
    toBytes(): Uint8Array;
}
```

### DelegationLevel

Represents a single level in a delegation chain.

```typescript
class DelegationLevel {
    constructor(pubkey: Uint8Array, signature: SchnorrSignature);

    pubkey(): Uint8Array;
    signature(): SchnorrSignature;
}
```

## Constants

- `MAX_PROOF_STAKES`: 1000 - Maximum stakes per proof
- `DEFAULT_STAKE_UTXO_CONFIRMATIONS`: 2016 - Required confirmations
- `PROOF_DUST_THRESHOLD`: 10000000000 - Minimum stake amount (100 XEC)
- `MAX_DELEGATION_LEVELS`: 20 - Maximum levels in a delegation chain

## Error Handling

All operations that can fail return `Result<T, String>` in Rust or throw exceptions in WebAssembly:

```typescript
try {
    const proof = builder.build();
    console.log('Success:', proof.proofId().toHex());
} catch (error) {
    console.error('Failed to build proof:', error);
}
```

Common errors:

- `"Amount below dust threshold"` - Stake amount too small
- `"Too many stakes"` - Exceeded maximum stake limit
- `"Cannot build proof with no stakes"` - No stakes added
- `"Failed to sign stake"` - Invalid private key or signing error
- `"Too many delegation levels (max: 20)"` - Exceeded delegation chain limit
- `"Delegation key mismatch"` - Secret key doesn't match expected public key
- `"Invalid delegation format"` - Malformed delegation data

## Integration

This library is designed to integrate with:

- **Bitcoin ABC nodes**: Generated proofs and delegations can be submitted via RPC
- **eCash wallets**: For proof creation, delegation management, and key rotation
- **Web applications**: Via WebAssembly bindings for client-side operations
- **Node.js services**: For server-side proof and delegation processing
- **Mining pools**: For delegating proof control without transferring ownership

## Security Considerations

- **Private Key Handling**: Keys are only used for signing, never stored
- **Randomness**: Uses secure random number generation for signatures
- **Validation**: All inputs are validated before processing
- **Memory Safety**: Rust's memory safety prevents buffer overflows
- **Delegation Security**: Delegation chains are cryptographically verified at each level
- **Key Rotation**: Delegations enable secure key rotation without proof reconstruction

## Testing

```bash
# Run Rust tests
cargo test
```
