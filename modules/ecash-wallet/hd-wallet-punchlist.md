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

**Completed**: Foundation, Address Generation, Enhanced Sync, Transaction Building, Signing, and Watch-Only Wallet Support (sections 1-9)

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
- ✅ Change address generation in transactions
    - Implemented `getChangeScript()` unified method for HD and non-HD wallets
    - Updated transaction building to use change addresses for HD wallets
    - Fixed change index incrementing logic (only increments when change output is actually created)
    - Automatic UTXO set updates after transactions for HD wallets
- ✅ Unified API for UTXO-to-keypair operations
    - `getPrivateKeyForUtxo(utxo: WalletUtxo)`: Returns private key for UTXO's address
    - `getPublicKeyForUtxo(utxo: WalletUtxo)`: Returns public key for UTXO's address
    - `getScriptForUtxo(utxo: WalletUtxo)`: Returns script for UTXO's address
    - `isWalletScript(script: Script)`: Checks if script belongs to wallet (any address for HD)
    - All methods handle both HD and non-HD wallets internally
- ✅ Signing logic updated for HD wallets
    - Uses unified API methods for keypair lookup
    - Supports signing inputs from different HD addresses
    - Updated `_updateUtxosAfterSuccessfulBuild` to correctly identify wallet-owned outputs for HD wallets
- ✅ Comprehensive test coverage
    - HD wallet transaction building and broadcasting tests
    - Change address verification in tests
    - Chained transaction support for HD wallets
- ✅ Watch-Only Wallet Support
    - `WatchOnlyWallet` class for read-only wallet functionality
    - Non-HD watch-only wallets via `fromAddress()`
    - HD watch-only wallets via `fromXpub()` with xpub support
    - All address generation methods (getReceiveAddress, getChangeAddress, getNextReceiveAddress, getNextChangeAddress, getAllAddresses)
    - Sync functionality for both HD and non-HD watch-only wallets
    - UTXO tracking and balance calculation
    - Comprehensive unit tests and e2e tests
    - `HdNode.xpub()` and `HdNode.fromXpub()` methods in ecash-lib

**Remaining**: See "Remaining Tasks" section at the end of this document

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

### 7. Change Address Generation in Transactions

- [x] Implement unified `getChangeScript()` method
    - Works for both HD and non-HD wallets
    - For HD wallets, calls `getNextChangeAddress()` and returns the script
    - For non-HD wallets, returns the single address script
    - Automatically caches change addresses in `keypairs` map

- [x] Update transaction building methods to use change addresses
    - Modified `_getBuiltAction()` to use `getChangeScript()` for XEC change
    - Updated `finalizeOutputs()` call sites to conditionally use `getChangeScript()` only when needed
    - Fixed change index incrementing to only occur when change output is actually created

- [x] Update UTXO set management after transactions
    - Modified `_updateUtxosAfterSuccessfulBuild` to use `isWalletScript()` for HD wallets
    - Ensures all wallet-owned outputs (including change to different HD addresses) are added to UTXO set
    - HD wallets now automatically update UTXO set after transactions, matching non-HD behavior

- [x] Update all transaction building methods:
    - `action()` method - ✅ Uses unified API
    - `send()` method - ✅ Uses unified API (via `action()`)
    - `sendMany()` method - ✅ Uses unified API (via `action()`)
    - Chained transactions - ✅ Uses unified API

- [x] Ensure change addresses are cached in `keypairs` before transaction signing
    - `getChangeScript()` automatically caches via `getNextChangeAddress()`

### 8. UTXO to Private Key Matching

- [x] WalletUtxo implementation (prerequisite)
    - `WalletUtxo` extends `ScriptUtxo` with `address: string` field
    - All UTXOs now have `address` field for direct keypair lookup
    - No need to derive address from script during signing

- [x] Unified API methods for UTXO-to-keypair operations
    - `getPrivateKeyForUtxo(utxo: WalletUtxo): Uint8Array | undefined`
        - Uses `utxo.address` to look up keypair in `keypairs` map
        - Returns `sk` from keypair, or undefined if not found
        - For non-HD wallets, returns `this.sk` directly
    - `getPublicKeyForUtxo(utxo: WalletUtxo): Uint8Array | undefined`
        - Similar to `getPrivateKeyForUtxo` but returns public key
        - For non-HD wallets, returns `this.pk` directly
    - `getScriptForUtxo(utxo: WalletUtxo): Script | undefined`
        - Returns script for the UTXO's address
        - For non-HD wallets, returns `this.script` directly
    - `isWalletScript(script: Script): boolean`
        - Checks if a script belongs to the wallet
        - For HD wallets, checks against all addresses in `keypairs` map
        - For non-HD wallets, checks against single address script

- [x] Updated signing logic to use unified API
    - Modified `p2pkhUtxoToBuilderInput` to use `getPrivateKeyForUtxo()`, `getPublicKeyForUtxo()`, and `getScriptForUtxo()`
    - Signing logic now automatically handles both HD and non-HD wallets
    - Each input uses the correct keypair based on its `WalletUtxo.address` field
    - No conditional logic needed in calling code - unified API handles it internally

- [x] Updated UTXO set management
    - `_updateUtxosAfterSuccessfulBuild` uses `isWalletScript()` to identify wallet-owned outputs
    - Correctly handles outputs to different HD addresses (change outputs)
    - Ensures HD wallets automatically update UTXO set after transactions

- [x] Test coverage
    - Added `test/hdTransactions.test.ts` with comprehensive HD wallet transaction tests
    - Tests verify change addresses are correctly generated and used
    - Tests verify chained transactions work with HD wallets
    - Tests verify UTXO set updates correctly after transactions

### 9. Watch-Only Wallet Support

- [x] Created `WatchOnlyWallet` class
    - Separate class from `Wallet` for read-only wallet functionality
    - Supports both non-HD (single address) and HD (xpub) wallets
    - Cannot sign transactions (watch-only mode)
    - Exposes `utxos` and `balanceSats` properties

- [x] Non-HD watch-only wallet support
    - `WatchOnlyWallet.fromAddress(address: string, chronik: ChronikClient)` static constructor
    - Single-address watch-only wallet
    - Supports UTXO syncing and balance calculation
    - E2e tests verify it tracks the same address as a regular Wallet

- [x] HD watch-only wallet support
    - `WatchOnlyWallet.fromXpub(xpub: string, chronik: ChronikClient, options?)` static constructor
    - Accepts same options shape as `Wallet` (accountNumber, receiveIndex, changeIndex)
    - Stores xpub instead of private keys
    - All address generation methods work (getReceiveAddress, getChangeAddress, getNextReceiveAddress, getNextChangeAddress, getAllAddresses)
    - Sync functionality queries UTXOs for all addresses from 0 to receiveIndex and 0 to changeIndex
    - Always derives all addresses from 0 to indices during sync (ensures consistency even if wallet cached additional addresses)

- [x] Xpub support in ecash-lib
    - Added `HdNode.xpub(version?: number): string` method
        - Serializes HdNode's public key, chain code, depth, index, and parent fingerprint
        - Base58check encodes the 78-byte payload
        - Default version is 0x0488b21e (mainnet xpub)
    - Added `HdNode.fromXpub(xpub: string): HdNode` static method
        - Decodes base58check xpub string
        - Parses components and constructs HdNode (without private key)
        - Validates xpub format and depth

- [x] Comprehensive test coverage
    - Unit tests in `src/watchonly.test.ts`
        - Tests for both non-HD and HD watch-only wallets
        - Tests for address generation methods
        - Tests for sync functionality
        - Tests for xpub encoding/decoding
    - E2e tests in `test/watchOnly.test.ts` (non-HD)
        - Creates Wallet, sends XEC, mints token, sends transactions
        - Creates WatchOnlyWallet from address, syncs, verifies same balance and UTXOs
    - E2e tests in `test/hdWatchOnly.test.ts` (HD)
        - Creates HD Wallet from mnemonic, performs ALP genesis, sends XEC
        - Creates HD WatchOnlyWallet from xpub with discovered indices
        - Syncs both and verifies same balance, UTXOs, and addresses

## Remaining Tasks

### Watch-Only HD Wallet Support

- [x] Add `WatchOnlyWallet.fromXpub(xpub: string, chronik: ChronikClient, options?)` for watch-only HD wallets
    - Separate `WatchOnlyWallet` class (not part of `Wallet` class)
    - Stores xpub instead of private keys
    - Cannot sign transactions (watch-only mode)
    - Supports address generation and UTXO syncing
    - Accepts same options shape as `Wallet` (accountNumber, receiveIndex, changeIndex)
    - Exposes `utxos` and `balanceSats` properties
    - Provides `next change address` and `next receive address` methods
    - Added `HdNode.xpub()` method to ecash-lib for xpub encoding
    - Added `HdNode.fromXpub()` static method to ecash-lib for xpub decoding
    - Comprehensive unit tests and e2e tests

- [x] Add `WatchOnlyWallet.fromAddress(address: string, chronik: ChronikClient)` for non-HD watch-only wallets
    - Single-address watch-only wallet support
    - Supports UTXO syncing and balance calculation
    - E2e tests verify it tracks the same address as a regular Wallet

### Address Discovery with Gap Limit

- [ ] Add method `syncAndDiscoverAddresses(): Promise<void>`
    - Manual method for wallet restoration/discovery scenarios
    - Syncs all known addresses first
    - Checks addresses sequentially from index 0 with gap limit (e.g., 20 consecutive unused addresses)
    - Checks for funds at addresses with indices < current index
    - Automatically discovers and adds addresses that have received funds
    - Updates indices accordingly
    - Note: Normal `sync()` assumes indices are accurate and does not perform gap limit checking
