# ecash-wallet Implementation Punchlist

This document tracks the migration of transaction building and broadcasting from direct `ecash-lib` usage to `ecash-wallet` across Cashtab components.

## Status

- ✅ **SendXec.tsx** - Already migrated to ecash-wallet
- 🚧 **components/Etokens/Token/index.tsx** - In progress (sendToken(), burn(), handleMint() migrated)
- ✅ **components/Etokens/CreateTokenForm/index.tsx** - Migrated (token creation migrated)

## Components That Send Transactions

### 1. transactions/index.js

**File:** `cashtab/src/transactions/index.js`

**Status:** ❌ Not migrated (to be removed last)

**Functions:**

- `sendXec()` - Main function that builds and broadcasts XEC transactions using `ecash-lib`'s `TxBuilder` directly
- `getMaxSendAmountSatoshis()` - Calculates max send amount (uses `TxBuilder` for fee calculation)

**Used by:**

- `components/Etokens/Token/index.tsx` (Agora listing functions only)

**Migration Notes:**

- **This file will be removed LAST** as part of the cleanup phase
- Components will be migrated first to use `ecash-wallet` directly, replacing all calls to `sendXec()`
- Once all components are migrated and no longer depend on this file, it can be safely removed
- This includes removing all utility functions related to transactions from Cashtab itself

---

### 2. components/Etokens/Token/index.tsx

**File:** `cashtab/src/components/Etokens/Token/index.tsx`

**Status:** 🚧 In progress

**Functions that send transactions:**

#### 2.1. `sendToken()` (lines ~1000-1040)

- **Status:** ✅ Migrated to ecash-wallet
- **Purpose:** Send eTokens (SLP/ALP) to a recipient
- **Uses:** `ecash-wallet`'s `action()` API directly
- **Transaction Type:** Token SEND with token inputs as required inputs
- **Migration Notes:**
    - Uses `payment.Action` with `SendAction` tokenAction
    - `ecash-wallet` handles UTXO selection and token change automatically
    - No manual token change output needed

#### 2.2. `createNftMintInputs()` (REMOVED)

- **Status:** ✅ Removed - No longer needed
- **Reason:** `ecash-wallet` automatically handles creating qty-1 inputs via chained transactions when minting NFT children
- **Migration Notes:**
    - Fan-out workflow completely deprecated
    - NFT child minting now uses `ecash-wallet` directly with `GENESIS` action
    - `ecash-wallet` automatically creates fan-out transactions if needed

#### 2.3. `burn()` (lines ~1319-1395)

- **Status:** ✅ Migrated to ecash-wallet
- **Purpose:** Burn eTokens
- **Uses:** `ecash-wallet`'s `action()` API directly
- **Transaction Type:** Token BURN with `BurnAction`
- **Migration Notes:**
    - Uses `payment.Action` with `BurnAction` tokenAction
    - `ecash-wallet` handles UTXO selection automatically (finds UTXOs that exactly sum to `burnAtoms`)
    - No manual target outputs needed - just OP_RETURN output

#### 2.4. NFT Child Minting (in `CreateTokenForm/index.tsx`)

- **Status:** ✅ Migrated to ecash-wallet
- **Purpose:** Mint NFT child tokens from NFT parent tokens
- **Uses:** `ecash-wallet`'s `action()` API directly
- **Transaction Type:** NFT child GENESIS transaction
- **Migration Notes:**
    - Uses `payment.Action` with `GENESIS` tokenAction for `SLP_TOKEN_TYPE_NFT1_CHILD`
    - Requires `groupTokenId` (parent token ID) - passed as prop from Token component
    - `ecash-wallet` automatically handles creating qty-1 inputs via chained transactions if needed
    - No manual fan-out transactions required
    - Removed `nftChildGenesisInput` prop - now just passes `groupTokenId` string

#### 2.5. `handleMint()` (lines ~1320-1383)

- **Status:** ✅ Migrated to ecash-wallet
- **Purpose:** Mint new tokens using mint baton
- **Uses:** `ecash-wallet`'s `action()` API directly
- **Transaction Type:** Token MINT transaction
- **Migration Notes:**
    - Uses `payment.Action` with `MINT` tokenAction
    - `ecash-wallet` handles UTXO selection automatically, including finding mint batons
    - Outputs include: OP_RETURN, minted token output, and mint baton output
    - Removed dependency on `getMintTargetOutputs()` and `getAlpMintTargetOutputs()` helper functions
    - Note: Minting is not currently supported for SLP_TOKEN_TYPE_MINT_VAULT tokens (they don't have mint batons, so the UI never shows the mint option for them)

#### 2.6. `listNftOneshot()` (lines ~1540-1670)

- **Purpose:** List an NFT for sale on Agora (oneshot offer)
- **Uses:** `sendXec()` from `transactions/index.js` (called twice - ad setup tx and offer tx)
- **Transaction Type:** Two sequential transactions:
    1. Ad setup transaction (sends NFT to P2SH)
    2. Offer transaction (creates Agora oneshot offer)

#### 2.7. `listAlpPartial()` (lines ~1870-1977)

- **Purpose:** List ALP tokens for sale on Agora (partial offer)
- **Uses:** `sendXec()` from `transactions/index.js`
- **Transaction Type:** Agora partial offer listing with token inputs

#### 2.8. `listSlpPartial()` (lines ~1979-2140)

- **Purpose:** List SLP tokens for sale on Agora (partial offer)
- **Uses:** `sendXec()` from `transactions/index.js` (called twice - ad setup tx and offer tx)
- **Transaction Type:** Two sequential transactions:
    1. Ad setup transaction
    2. Offer transaction (creates Agora partial offer)

**Migration Notes:**

- `sendToken()` ✅ - Migrated to use `ecash-wallet` directly
- `burn()` ✅ - Migrated to use `ecash-wallet` directly
- `handleMint()` ✅ - Migrated to use `ecash-wallet` directly
- NFT child minting ✅ - Migrated to use `ecash-wallet` directly (in `CreateTokenForm`)
- Fan-out workflow ✅ - Removed (no longer needed - `ecash-wallet` handles automatically)
- Remaining functions still use `sendXec()` helper from `transactions/index.js`
- **Will be migrated to use `ecash-wallet` directly** - replacing `sendXec()` calls with `ecash-wallet`'s `action()` API
- Some functions require sequential transactions (ad setup + offer)
- Token transactions require specific token UTXOs as required inputs

---

### 3. components/Etokens/CreateTokenForm/index.tsx

**File:** `cashtab/src/components/Etokens/CreateTokenForm/index.tsx`

**Status:** ✅ Migrated

**Functions that send transactions:**

#### 3.1. Token Creation (lines ~717-820)

- **Status:** ✅ Migrated to ecash-wallet
- **Purpose:** Create new tokens (genesis transactions)
- **Uses:** `ecash-wallet`'s `action()` API directly
- **Transaction Type:** Token genesis transaction
- **Migration Notes:**
    - Uses `payment.Action` with `GENESIS` tokenAction
    - Supports SLP fungible, SLP NFT parent (collection), and ALP token creation
    - Handles optional mint baton creation
    - Uses `GENESIS_TOKEN_ID_PLACEHOLDER` for genesis outputs
    - Both ALP and SLP use the same output structure: qty at outIdx 1, mint baton at outIdx 2
    - Removed dependency on `getSlpGenesisTargetOutput()`, `getNftParentGenesisTargetOutputs()`, and `getAlpGenesisTargetOutputs()` helper functions
    - NFT child minting was already migrated (uses ecash-wallet directly)

---

### 4. components/Agora/OrderBook/index.tsx

**File:** `cashtab/src/components/Agora/OrderBook/index.tsx`

**Status:** ❌ Not migrated

**Functions that send transactions:**

#### 4.1. `cancelOffer()` (lines ~240-337)

- **Purpose:** Cancel an Agora partial offer
- **Uses:** Direct `ecash-lib` and `ecash-agora` APIs
- **Transaction Building:**
    - Uses `agoraPartial.cancelTx()` from `ecash-agora`
    - Manually signs fuel inputs using `P2PKHSignatory`
    - Broadcasts via `chronik.broadcastTx()`
- **Transaction Type:** Agora offer cancellation

#### 4.2. `acceptOffer()` (lines ~339-461)

- **Purpose:** Accept/buy an Agora partial offer
- **Uses:** Direct `ecash-lib` and `ecash-agora` APIs
- **Transaction Building:**
    - Uses `agoraPartial.acceptTx()` from `ecash-agora`
    - Manually signs fuel inputs using `P2PKHSignatory`
    - Broadcasts via `chronik.broadcastTx()`
- **Transaction Type:** Agora offer acceptance

**Migration Notes:**

- These functions build transactions directly using `ecash-agora` and `ecash-lib`
- They manually handle fuel input signing
- Should migrate to use `ecash-wallet` for fuel input handling and broadcasting

---

### 5. components/Agora/Collection/index.tsx

**File:** `cashtab/src/components/Agora/Collection/index.tsx`

**Status:** ❌ Not migrated

**Functions that send transactions:**

#### 5.1. `acceptOffer()` in `OneshotSwiper` (lines ~156-250)

- **Purpose:** Buy an NFT from an Agora oneshot offer
- **Uses:** Direct `ecash-lib` and `ecash-agora` APIs
- **Transaction Building:**
    - Uses `agoraOneshot.acceptTx()` from `ecash-agora`
    - Manually signs fuel inputs using `P2PKHSignatory`
    - Broadcasts via `chronik.broadcastTx()`
- **Transaction Type:** Agora oneshot offer acceptance

#### 5.2. `cancelOffer()` in `OneshotSwiper` (lines ~252-349)

- **Purpose:** Cancel an NFT Agora oneshot listing
- **Uses:** Direct `ecash-lib` and `ecash-agora` APIs
- **Transaction Building:**
    - Uses `agoraOneshot.cancelTx()` from `ecash-agora`
    - Manually signs fuel inputs using `P2PKHSignatory`
    - Broadcasts via `chronik.broadcastTx()`
- **Transaction Type:** Agora oneshot offer cancellation

**Migration Notes:**

- Similar to OrderBook component - uses `ecash-agora` directly
- Manually handles fuel input signing
- Should migrate to use `ecash-wallet` for fuel input handling and broadcasting

---

## Migration Strategy

### Phase 1: Component Migration (Drop in ecash-wallet)

1. Migrate `components/Etokens/Token/index.tsx` 🚧 In progress
    - ✅ `sendToken()` - Migrated to `ecash-wallet`
    - ✅ `burn()` - Migrated to `ecash-wallet`
    - ✅ `handleMint()` - Migrated to `ecash-wallet`
    - ✅ NFT child minting - Migrated to `ecash-wallet` (in `CreateTokenForm`)
    - ✅ Fan-out workflow - Removed (no longer needed)
    - ❌ `listNftOneshot()` - Still uses `sendXec()`
    - ❌ `listAlpPartial()` - Still uses `sendXec()`
    - ❌ `listSlpPartial()` - Still uses `sendXec()`
    - Pay special attention to sequential transaction flows (ad setup + offer)
    - Token transactions require specific token UTXOs as required inputs

2. Migrate `components/Etokens/CreateTokenForm/index.tsx` ✅ Complete
    - ✅ Token creation/genesis - Migrated to `ecash-wallet`
    - ✅ NFT child minting - Already migrated (uses ecash-wallet directly)

3. Migrate `components/Agora/OrderBook/index.tsx`
    - Replace direct `ecash-lib`/`ecash-agora` usage with `ecash-wallet`
    - Use `ecash-wallet` for fuel input handling and broadcasting
    - Requires `ecash-wallet` support for Agora transactions

4. Migrate `components/Agora/Collection/index.tsx`
    - Similar to OrderBook, replace direct transaction building with `ecash-wallet`
    - Use `ecash-wallet` for fuel input handling and broadcasting

### Phase 2: Cleanup (Remove unused utilities)

5. Remove `transactions/index.js` and related transaction utilities
    - Only after all components are migrated and no longer use `sendXec()`
    - Remove all utility functions related to transactions from Cashtab itself

### Phase 3: Final Cleanup (Wallet storage structure)

6. Update wallet storage structure in `useWallet.ts`
    - Remove `activeWallet` usage (last-last step)
    - Update to use `ecash-wallet`'s wallet structure directly

---

## Dependencies

- `ecash-wallet` must support:
    - Token transactions (SEND, BURN, MINT, GENESIS)
    - Agora transactions (oneshot and partial offers)
    - Sequential transaction flows
    - Required inputs (token UTXOs, P2SH inputs)
    - Custom signatories (Agora signatories)

---

## Testing Considerations

Each migrated component should:

- Maintain existing test coverage
- Test all transaction types (send, burn, mint, etc.)
- Test error handling
- Test sequential transaction flows where applicable
- Verify transaction structure matches previous implementation
