# ecash-wallet Implementation Punchlist

This document tracks the migration of transaction building and broadcasting from direct `ecash-lib` usage to `ecash-wallet` across Cashtab components.

## Status

- ✅ **SendXec.tsx** - Already migrated to ecash-wallet
- ✅ **components/Etokens/Token/index.tsx** - Migrated (all functions migrated to ecash-wallet or hybrid approach)
- ✅ **components/Etokens/CreateTokenForm/index.tsx** - Migrated (token creation migrated)

## Components That Send Transactions

### 1. transactions/index.js

**File:** `cashtab/src/transactions/index.js`

**Status:** ❌ Not migrated (to be removed last)

**Functions:**

- `sendXec()` - Main function that builds and broadcasts XEC transactions using `ecash-lib`'s `TxBuilder` directly
- `getMaxSendAmountSatoshis()` - Calculates max send amount (uses `TxBuilder` for fee calculation)

**Used by:**

- None (all functions in `components/Etokens/Token/index.tsx` have been migrated)

**Migration Notes:**

- **This file will be removed LAST** as part of the cleanup phase
- Components will be migrated first to use `ecash-wallet` directly, replacing all calls to `sendXec()`
- Once all components are migrated and no longer depend on this file, it can be safely removed
- This includes removing all utility functions related to transactions from Cashtab itself

---

### 2. components/Etokens/Token/index.tsx

**File:** `cashtab/src/components/Etokens/Token/index.tsx`

**Status:** ✅ Migrated

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

- **Status:** ✅ Partially migrated to ecash-wallet
- **Purpose:** List an NFT for sale on Agora (oneshot offer)
- **Uses:** Hybrid approach - `ecash-wallet` for ad setup, `TxBuilder` for offer tx
- **Transaction Type:** Two sequential transactions:
    1. Ad setup transaction (sends NFT to P2SH) - uses `ecash-wallet`'s `action()` API
    2. Offer transaction (creates Agora oneshot offer) - uses `TxBuilder` directly (custom P2SH signatory)
- **Migration Notes:**
    - Ad setup transaction uses `payment.Action` with `SEND` tokenAction
    - `ecash-wallet` automatically handles NFT UTXO selection (no `requiredUtxos` needed)
    - Offer transaction uses `TxBuilder` directly due to custom `AgoraOneshotAdSignatory` requirement
    - Offer transaction is broadcast via `ecash-wallet.chronik.broadcastTx()`
    - Removed dependency on `getNft()` helper function (no longer needed)

#### 2.7. `listAlpPartial()` (lines ~1883-1970)

- **Status:** ✅ Migrated to ecash-wallet
- **Purpose:** List ALP tokens for sale on Agora (partial offer)
- **Uses:** `ecash-wallet`'s `action()` API directly with `getAgoraPaymentAction()` from `ecash-agora`
- **Transaction Type:** Agora partial offer listing with token inputs
- **Migration Notes:**
    - Uses `getAgoraPaymentAction()` from `ecash-agora` to build the `payment.Action`
    - `ecash-wallet` automatically handles token UTXO selection and change
    - Removed dependency on `getAlpAgoraListTargetOutputs()` and `getSendTokenInputs()` for this function
    - ALP partial listings are single-transaction (unlike SLP which requires 2 sequential txs)

#### 2.8. `listSlpPartial()` (lines ~1979-2140)

- **Status:** ✅ Partially migrated to ecash-wallet
- **Purpose:** List SLP tokens for sale on Agora (partial offer)
- **Uses:** Hybrid approach - `ecash-wallet` for ad setup, `TxBuilder` for offer tx
- **Transaction Type:** Two sequential transactions:
    1. Ad setup transaction - uses `ecash-wallet`'s `action()` API
    2. Offer transaction (creates Agora partial offer) - uses `TxBuilder` directly (custom P2SH signatory)
- **Migration Notes:**
    - Ad setup transaction uses `payment.Action` with `SEND` tokenAction
    - `ecash-wallet` automatically handles token UTXO selection and change (no `requiredUtxos` needed)
    - Offer transaction uses `TxBuilder` directly due to custom `AgoraPartialAdSignatory` requirement
    - Offer transaction is broadcast via `ecash-wallet.chronik.broadcastTx()`
    - Note: `ecash-wallet` does not yet have built-in support for chained SLP Agora listings

**Migration Notes:**

- `sendToken()` ✅ - Migrated to use `ecash-wallet` directly
- `burn()` ✅ - Migrated to use `ecash-wallet` directly
- `handleMint()` ✅ - Migrated to use `ecash-wallet` directly
- `listAlpPartial()` ✅ - Migrated to use `ecash-wallet` directly (uses `getAgoraPaymentAction()` from `ecash-agora`)
- `listNftOneshot()` ✅ - Partially migrated (ad setup uses `ecash-wallet`, offer uses `TxBuilder` for custom signatory)
- `listSlpPartial()` ✅ - Partially migrated (ad setup uses `ecash-wallet`, offer uses `TxBuilder` for custom signatory)
- NFT child minting ✅ - Migrated to use `ecash-wallet` directly (in `CreateTokenForm`)
- Fan-out workflow ✅ - Removed (no longer needed - `ecash-wallet` handles automatically)
- **All functions in this component have been migrated** - no longer uses `sendXec()` from `transactions/index.js`
- Cleanup: Removed unused helper functions (`getMintTargetOutputs`, `getAlpMintTargetOutputs`, `getSlpGenesisTargetOutput`, `getNftParentGenesisTargetOutputs`, `getAlpGenesisTargetOutputs`, `getAlpAgoraListTargetOutputs`, `getNft`)

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

**Status:** ✅ Migrated

**Functions that send transactions:**

#### 4.1. `cancelOffer()` (lines ~240-260)

- **Status:** ✅ Migrated to ecash-wallet
- **Purpose:** Cancel an Agora partial offer
- **Uses:** `ecash-agora`'s `cancel()` method with `ecash-wallet`
- **Transaction Type:** Agora offer cancellation
- **Migration Notes:**
    - Uses `agoraPartial.cancel()` from `ecash-agora` which handles fuel input selection and signing via `ecash-wallet`
    - `ecash-wallet` automatically handles fuel UTXO selection and signing
    - Broadcasting is handled by `ecash-wallet` via the `cancel()` method
    - Removed dependency on manual fuel input signing with `P2PKHSignatory`
    - Removed dependency on `getAgoraCancelFuelInputs()` and `ignoreUnspendableUtxos()`

#### 4.2. `acceptOffer()` (lines ~262-320)

- **Status:** ✅ Migrated to ecash-wallet
- **Purpose:** Accept/buy an Agora partial offer
- **Uses:** `ecash-agora`'s `take()` method with `ecash-wallet`
- **Transaction Type:** Agora offer acceptance
- **Migration Notes:**
    - Uses `agoraPartial.take()` from `ecash-agora` which handles fuel input selection and signing via `ecash-wallet`
    - `ecash-wallet` automatically handles fuel UTXO selection and signing
    - Broadcasting is handled by `ecash-wallet` via the `take()` method
    - Removed dependency on manual fuel input signing with `P2PKHSignatory`
    - Removed dependency on `getAgoraPartialAcceptFuelInputs()` and `ignoreUnspendableUtxos()`

---

### 5. components/Agora/Collection/index.tsx

**File:** `cashtab/src/components/Agora/Collection/index.tsx`

**Status:** ✅ Migrated

**Functions that send transactions:**

#### 5.1. `acceptOffer()` in `OneshotSwiper` (lines ~156-200)

- **Status:** ✅ Migrated to ecash-wallet
- **Purpose:** Buy an NFT from an Agora oneshot offer
- **Uses:** `ecash-agora`'s `take()` method with `ecash-wallet`
- **Transaction Type:** Agora oneshot offer acceptance
- **Migration Notes:**
    - Uses `agoraOneshot.take()` from `ecash-agora` which handles fuel input selection and signing via `ecash-wallet`
    - `ecash-wallet` automatically handles fuel UTXO selection and signing
    - Broadcasting is handled by `ecash-wallet` via the `take()` method
    - Removed dependency on manual fuel input signing with `P2PKHSignatory`
    - Removed dependency on `getAgoraOneshotAcceptFuelInputs()` and `ignoreUnspendableUtxos()`

#### 5.2. `cancelOffer()` in `OneshotSwiper` (lines ~202-250)

- **Status:** ✅ Migrated to ecash-wallet
- **Purpose:** Cancel an NFT Agora oneshot listing
- **Uses:** `ecash-agora`'s `cancel()` method with `ecash-wallet`
- **Transaction Type:** Agora oneshot offer cancellation
- **Migration Notes:**
    - Uses `agoraOneshot.cancel()` from `ecash-agora` which handles fuel input selection and signing via `ecash-wallet`
    - `ecash-wallet` automatically handles fuel UTXO selection and signing
    - Broadcasting is handled by `ecash-wallet` via the `cancel()` method
    - Removed dependency on manual fuel input signing with `P2PKHSignatory`
    - Removed dependency on `getAgoraCancelFuelInputs()` and `ignoreUnspendableUtxos()`

---

## Migration Strategy

### Phase 1: Component Migration (Drop in ecash-wallet)

1. Migrate `components/Etokens/Token/index.tsx` ✅ Complete

- ✅ `sendToken()` - Migrated to `ecash-wallet`
- ✅ `burn()` - Migrated to `ecash-wallet`
- ✅ `handleMint()` - Migrated to `ecash-wallet`
- ✅ `listAlpPartial()` - Migrated to `ecash-wallet` (uses `getAgoraPaymentAction()` from `ecash-agora`)
- ✅ `listNftOneshot()` - Partially migrated (ad setup uses `ecash-wallet`, offer uses `TxBuilder`)
- ✅ `listSlpPartial()` - Partially migrated (ad setup uses `ecash-wallet`, offer uses `TxBuilder`)
- ✅ NFT child minting - Migrated to `ecash-wallet` (in `CreateTokenForm`)
- ✅ Fan-out workflow - Removed (no longer needed)
- ✅ Cleanup: Removed unused helper functions (`getMintTargetOutputs`, `getAlpMintTargetOutputs`, `getSlpGenesisTargetOutput`, `getNftParentGenesisTargetOutputs`, `getAlpGenesisTargetOutputs`, `getAlpAgoraListTargetOutputs`, `getNft`)

2. Migrate `components/Etokens/CreateTokenForm/index.tsx` ✅ Complete
    - ✅ Token creation/genesis - Migrated to `ecash-wallet`
    - ✅ NFT child minting - Already migrated (uses ecash-wallet directly)

3. Migrate `components/Agora/OrderBook/index.tsx` ✅ Complete
    - ✅ `cancelOffer()` - Migrated to use `agoraPartial.cancel()` with `ecash-wallet`
    - ✅ `acceptOffer()` - Migrated to use `agoraPartial.take()` with `ecash-wallet`

4. Migrate `components/Agora/Collection/index.tsx` ✅ Complete
    - ✅ `acceptOffer()` - Migrated to use `agoraOneshot.take()` with `ecash-wallet`
    - ✅ `cancelOffer()` - Migrated to use `agoraOneshot.cancel()` with `ecash-wallet`

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
