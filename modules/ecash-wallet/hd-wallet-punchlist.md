# HD Wallet Support Punchlist

This document outlines the tasks required to add Hierarchical Deterministic (HD) wallet support to `ecash-wallet`.

## Overview

Currently, `ecash-wallet` implements a single-address wallet. This punchlist covers adding support for HD wallets that can generate multiple addresses using BIP32/BIP44 derivation paths.

## Derivation Path Strategy

Based on the Bitcoin-ABC and Electrum-ABC implementations, we will use:

- **Base path**: `m/44'/1899'/0'` (BIP44: purpose 44', coin type 1899' for XEC token-aware, account 0')
- **Receive addresses**: `m/44'/1899'/0'/0/<n>` where `n` is the address index (non-hardened)
- **Change addresses**: `m/44'/1899'/0'/1/<n>` where `n` is the address index (non-hardened)

## Core Requirements

### 1. Wallet Type Detection

- [ ] Add `isHD: boolean` property to `Wallet` class
    - Default to `false` for existing single-address wallets
    - Set to `true` for HD wallets created via new constructors

### 2. HD Wallet Constructor

- [ ] Add static constructor `Wallet.fromHDSeed(seed: Uint8Array, chronik: ChronikClient)`
    - Derive master HD node from seed
    - Derive base path `m/44'/1899'/0'`
    - Initialize HD wallet state
    - Set `isHD = true`
    - We should have a way of initializing with known receive and change indices, which app devs would store; and we should have a way of estimating these based on blockchain activity if we do not have them available

- [ ] Add static constructor `Wallet.fromHDMnemonic(mnemonic: string, chronik: ChronikClient)`
    - Convert mnemonic to seed using `mnemonicToSeed`
    - Call `fromHDSeed` internally

- [ ] Consider adding `Wallet.fromHDXpub(xpub: string, chronik: ChronikClient)` for watch-only HD wallets
    - Store xpub instead of private keys
    - Cannot sign transactions (watch-only mode)
    - Requires separate `isWatchOnly: boolean` flag

### 3. Index Tracking

- [ ] Add `receiveIndex: number` property
    - Tracks the highest derived receive address index
    - Initialize to 0
    - Increment when generating new receive addresses

- [ ] Add `changeIndex: number` property
    - Tracks the highest derived change address index
    - Initialize to 0
    - Increment when generating new change addresses

- [ ] Consider persistence mechanism for indices
    - Need way of accepting stored indices in constructor (ecash-wallet itself cannot have persistence, though it could be stored in an app)
    - Need method to derive from blockchain state during sync

### 4. Keypair Management

- [ ] Add `keypairs: Map<string, { sk: Uint8Array, pk: Uint8Array, pkh: Uint8Array, script: Script, address: string }>` property
    - Key: address string
    - Value: full keypair data for that address
    - Used to map addresses to their private keys for signing

- [ ] Add private method `_deriveKeypair(forChange: boolean, index: number): KeypairData`
    - Derives keypair at path `m/44'/1899'/0'/<forChange ? 1 : 0>/<index>`
    - Returns: `{ sk, pk, pkh, script, address }`
    - Caches result in `keypairs` map

- [ ] Add method `getKeypairForAddress(address: string): KeypairData | undefined`
    - Looks up keypair from `keypairs` map
    - Returns undefined if address not in wallet

### 5. Address Generation Methods

- [ ] Add `getNextReceiveAddress(): string`
    - Derives keypair at current `receiveIndex`
    - Increments `receiveIndex`
    - Caches keypair in `keypairs` map
    - Returns address string

- [ ] Add `getNextChangeAddress(): string`
    - Derives keypair at current `changeIndex`
    - Increments `changeIndex`
    - Caches keypair in `keypairs` map
    - Returns address string

- [ ] Add `getReceiveAddress(index: number): string`
    - Derives keypair at specific receive index
    - Does not increment `receiveIndex`
    - Caches keypair if not already cached
    - Returns address string

- [ ] Add `getChangeAddress(index: number): string`
    - Derives keypair at specific change index
    - Does not increment `changeIndex`
    - Caches keypair if not already cached
    - Returns address string

- [ ] Add `getAllAddresses(): string[]`
    - Returns array of all addresses in `keypairs` map
    - Useful for syncing all addresses

### 6. Enhanced Sync Method

- [ ] Modify `sync()` method to handle HD wallets
    - If `isHD === false`, use existing single-address sync logic
    - If `isHD === true`:
        - Get all addresses from `keypairs` map
        - Query chronik for UTXOs for all addresses
        - Merge UTXOs from all addresses into `this.utxos`
        - Update `tipHeight`

- [ ] Add gap limit checking during sync
    - After syncing, check if any addresses below current index have received funds
    - If funds found at lower indices, ensure those addresses are in `keypairs` map
    - Consider implementing gap limit (e.g., 20 unused addresses) before stopping address generation

- [ ] Add method `syncAndDiscoverAddresses(): Promise<void>`
    - Syncs all known addresses
    - Checks for funds at addresses with indices < current index
    - Automatically discovers and adds addresses that have received funds
    - Updates indices accordingly

### 7. Change Address Generation in Transactions

- [ ] Modify transaction building methods to use change addresses for HD wallets
    - In `_buildTx` or similar methods, detect if `isHD === true`
    - When change is needed, call `getNextChangeAddress()` instead of using single address
    - Ensure change output uses the newly generated change address

- [ ] Update all transaction building methods:
    - `action()` method
    - `send()` method
    - `sendMany()` method
    - Any other methods that create change outputs

- [ ] Ensure change addresses are cached in `keypairs` before transaction signing

### 8. UTXO to Private Key Matching

- [ ] Add method `getPrivateKeyForUtxo(utxo: ScriptUtxo): Uint8Array | undefined`
    - Extract address from `utxo.script`
    - Look up keypair in `keypairs` map using address
    - Return `sk` from keypair, or undefined if not found

- [ ] Modify signing logic to use address-based key lookup
    - Current code uses `P2PKHSignatory(this.sk, this.pk, sighash)` for single-address wallet
    - For HD wallets, need to:
        - Extract address from each UTXO being spent
        - Look up corresponding private key from `keypairs` map
        - Create signatory with the correct keypair for each input

- [ ] Update `_prepareInputs` or similar method
    - For each UTXO input, determine which address it belongs to
    - Look up private key for that address
    - Create appropriate signatory for each input

- [ ] Consider batch signing optimization
    - Group inputs by address to minimize keypair lookups
    - Reuse signatories when multiple inputs share the same address
