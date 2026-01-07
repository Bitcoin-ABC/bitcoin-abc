# HD Wallet Support Punchlist

This document outlines the tasks required to add Hierarchical Deterministic (HD) wallet support to `ecash-wallet`.

## Overview

Currently, `ecash-wallet` implements a single-address wallet. This punchlist covers adding support for HD wallets that can generate multiple addresses using BIP32/BIP44 derivation paths.

## Derivation Path Strategy

Based on the Bitcoin-ABC and Electrum-ABC implementations, we use:

- **Base path**: `m/44'/1899'/<accountNumber>'` (BIP44: purpose 44', coin type 1899' for XEC token-aware, account number defaults to 0 but is configurable)
- **Receive addresses**: `m/44'/1899'/<accountNumber>'/0/<n>` where `n` is the address index (non-hardened)
- **Change addresses**: `m/44'/1899'/<accountNumber>'/1/<n>` where `n` is the address index (non-hardened)

## Status

**Completed**: Foundation, Address Generation, and Enhanced Sync (sections 1-6)

- ✅ HD wallet type detection
- ✅ HD wallet constructor via `fromMnemonic` with options
- ✅ Account number support (configurable, defaults to 0)
- ✅ Index tracking (receiveIndex, changeIndex)
- ✅ Keypair management and derivation
- ✅ Address generation methods (getReceiveAddress, getChangeAddress, getNextReceiveAddress, getNextChangeAddress, getAllAddresses)
- ✅ Enhanced sync method for HD wallets
    - Syncs all addresses at or below current indices (0 to receiveIndex, 0 to changeIndex)
    - Derives missing addresses if keypairs count is less than expected
    - Merges UTXOs from all addresses
- ✅ WalletUtxo implementation
    - Created `WalletUtxo` interface extending `ScriptUtxo` with `address` field
    - Optimized address derivation (once per address, not per UTXO)
    - Enables efficient UTXO-to-keypair lookup for signing
- ✅ Comprehensive test coverage

**Next Steps**: Transaction building and signing (sections 7-8)

- Change address generation in transactions
- UTXO to private key matching for signing (now enabled by WalletUtxo.address field)

## Core Requirements

### 1. Wallet Type Detection

- [x] Add `isHD: boolean` property to `Wallet` class
    - Default to `false` for existing single-address wallets
    - Set to `true` for HD wallets created via new constructors

- [x] Add `accountNumber: number` property to `Wallet` class
    - Tracks the BIP44 account number used for derivation
    - Defaults to `0` if not specified
    - Used to construct base path: `m/44'/1899'/<accountNumber>'`

### 2. HD Wallet Constructor

- [x] Updated `Wallet.fromMnemonic()` to support HD wallets via options parameter
    - Added optional `options` parameter: `{ hd?: boolean, accountNumber?: number, receiveIndex?: number, changeIndex?: number }`
    - When `hd: true`, derives base path `m/44'/1899'/<accountNumber>'` (accountNumber defaults to 0)
    - Initializes HD wallet state and sets `isHD = true`
    - Supports initializing with known receive and change indices (app devs can store these)
    - Maintains backward compatibility: defaults to non-HD wallet if `hd` option not provided

- [ ] Consider adding `Wallet.fromHDXpub(xpub: string, chronik: ChronikClient)` for watch-only HD wallets
    - Store xpub instead of private keys
    - Cannot sign transactions (watch-only mode)
    - Requires separate `isWatchOnly: boolean` flag

### 3. Index Tracking

- [x] Add `receiveIndex: number` property
    - Tracks the highest derived receive address index
    - Initialize to 0
    - Can be set via `fromMnemonic` options parameter

- [x] Add `changeIndex: number` property
    - Tracks the highest derived change address index
    - Initialize to 0
    - Can be set via `fromMnemonic` options parameter

- [x] Persistence mechanism for indices
    - App devs can pass stored indices via `fromMnemonic` options (ecash-wallet itself cannot have persistence, though it could be stored in an app)
    - Still need method to derive from blockchain state during sync (see section 6)

### 4. Keypair Management

- [x] Add `keypairs: Map<string, KeypairData>` property
    - Key: address string
    - Value: full keypair data for that address (exported as `KeypairData` interface)
    - Used to map addresses to their private keys for signing

- [x] Add private method `_deriveKeypair(forChange: boolean, index: number): KeypairData`
    - Derives keypair at path `m/44'/1899'/<accountNumber>'/<forChange ? 1 : 0>/<index>`
    - Returns: `{ sk, pk, pkh, script, address }`
    - Caches result in `keypairs` map
    - First receive address (index 0) is automatically cached on HD wallet creation

- [x] Add method `getKeypairForAddress(address: string): KeypairData | undefined`
    - Looks up keypair from `keypairs` map
    - Returns undefined if address not in wallet

### 5. Address Generation Methods

- [x] Add `getNextReceiveAddress(): string`
    - Derives keypair at current `receiveIndex`
    - Increments `receiveIndex`
    - Caches keypair in `keypairs` map
    - Returns address string

- [x] Add `getNextChangeAddress(): string`
    - Derives keypair at current `changeIndex`
    - Increments `changeIndex`
    - Caches keypair in `keypairs` map
    - Returns address string

- [x] Add `getReceiveAddress(index: number): string`
    - Derives keypair at specific receive index
    - Does not increment `receiveIndex`
    - Caches keypair if not already cached
    - Returns address string

- [x] Add `getChangeAddress(index: number): string`
    - Derives keypair at specific change index
    - Does not increment `changeIndex`
    - Caches keypair if not already cached
    - Returns address string

- [x] Add `getAllAddresses(): string[]`
    - Returns array of all addresses in `keypairs` map
    - Useful for syncing all addresses

### 6. Enhanced Sync Method

- [x] Modify `sync()` method to handle HD wallets
    - If `isHD === false`, use existing single-address sync logic
    - If `isHD === true`:
        - Check if `keypairs.size >= (receiveIndex + 1) + (changeIndex + 1)`
        - If not, derive missing addresses by calling `getReceiveAddress(i)` and `getChangeAddress(i)` for all indices
        - Get all addresses from `keypairs` map
        - Query chronik for UTXOs for all addresses in parallel
        - Merge UTXOs from all addresses into `this.utxos`
        - Update `tipHeight`

- [x] WalletUtxo implementation
    - Created `WalletUtxo` interface extending `ScriptUtxo` with `address: string` field
    - Added `_convertToWalletUtxos()` method to batch-convert UTXOs (derives address once per address)
    - Updated `utxos` property type from `ScriptUtxo[]` to `WalletUtxo[]`
    - Updated all UTXO-returning methods to return `WalletUtxo[]`
    - Enables efficient address-based keypair lookup for signing

- [ ] Add method `syncAndDiscoverAddresses(): Promise<void>`
    - Manual method for wallet restoration/discovery scenarios
    - Syncs all known addresses first
    - Checks addresses sequentially from index 0 with gap limit (e.g., 20 consecutive unused addresses)
    - Checks for funds at addresses with indices < current index
    - Automatically discovers and adds addresses that have received funds
    - Updates indices accordingly
    - Note: Normal `sync()` assumes indices are accurate and does not perform gap limit checking

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

- [x] WalletUtxo implementation (prerequisite)
    - `WalletUtxo` extends `ScriptUtxo` with `address: string` field
    - All UTXOs now have `address` field for direct keypair lookup
    - No need to derive address from script during signing

- [ ] Add method `getPrivateKeyForUtxo(utxo: WalletUtxo): Uint8Array | undefined`
    - Use `utxo.address` (already available in WalletUtxo)
    - Look up keypair in `keypairs` map using address
    - Return `sk` from keypair, or undefined if not found

- [ ] Modify signing logic to use address-based key lookup
    - Current code uses `P2PKHSignatory(this.sk, this.pk, sighash)` for single-address wallet
    - For HD wallets, need to:
        - Use `utxo.address` from each `WalletUtxo` being spent
        - Look up corresponding private key from `keypairs` map
        - Create signatory with the correct keypair for each input

- [ ] Update `_prepareInputs` or similar method
    - For each UTXO input, use `utxo.address` to determine which address it belongs to
    - Look up private key for that address
    - Create appropriate signatory for each input

- [ ] Consider batch signing optimization
    - Group inputs by address to minimize keypair lookups
    - Reuse signatories when multiple inputs share the same address
