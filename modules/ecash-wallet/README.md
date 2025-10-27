# ecash-wallet

A production-ready wallet class for building and broadcasting eCash (XEC) txs

## Use

Install with `npm` (when published).

`npm i ecash-wallet`

Import. Create your `Wallet` and use methods.

```
import { Wallet } from "ecash-wallet";

const mnemonic = 'morning average minor stable parrot refuse credit exercise february mirror just begin',

const wallet = Wallet.fromMnemonic(mnemonic, chronik);
```

See tests for detailed methods.

## Roadmap

`ecash-wallet` is engineered to be a drop-in wallet lib for any ecash application that needs wallet functionality. The first milestone demonstrating minimal fulfillment of this requirement will be the integration of `ecash-wallet` into Cashtab.

### Phase One, Cashtab feature parity

-   XEC actions
    [x] Send XEC to one recipient
    [x] Send XEC to many recipients

-   GENESIS, MINT, SEND, and BURN for all token types
    [x] SLP_TOKEN_TYPE_FUNGIBLE
    [x] ALP_TOKEN_TYPE_STANDARD
    [x] SLP_TOKEN_TYPE_MINT_VAULT SEND and BURN actions  
    [x] SLP_TOKEN_TYPE_NFT1_GROUP
    [x] SLP_TOKEN_TYPE_NFT1_CHILD (Mint NFTs)
    [x] DataAction for ALP_TOKEN_TYPE_STANDARD txs
    [X] BURN txs for arbitrary amounts using BURN method (intentional burn, not SEND)
    [X] One-step mints for SLP NFTs
-   Agora actions (PARTIAL and ONESHOT)
    [] SLP (requires "chained" txs)
    [] ALP

### Phase Two, extended functionality

[] Support for chained XEC txs, i.e. handling an Action that requires more than one tx due to the 100kb tx size restriction
[] Support for chained token txs, i.e. handling an Action that requires more than one tx due to token protocol per-tx output limits

### Phase Three, wishlist

[] HD wallets
[] Fine-grained utxo control, avalanche proofs
[] SLP_TOKEN_TYPE_MINT_VAULT GENESIS and MINT actions

## Change log

-   0.0.0 Init with constructor and `sync` method [D17773](https://reviews.bitcoinabc.org/D17773)
-   0.0.1 Add utxo getter methods `getFuelUtxos` and `getSpendableCoinbaseUtxos` [D17779](https://reviews.bitcoinabc.org/D17779)

### 1.0.0

[D17822](https://reviews.bitcoinabc.org/D17822) Add support for building and broadcasting txs, including ALP and SLP token txs. Update methods and syntax. Add preliminary support for Postage protocol.
[D18384](https://reviews.bitcoinabc.org/D18384) Add `fromMnemonic` constructor, make `Wallet` a normal export (not uniquely a default export), call `broadcastTx` using hex rawTx to facilitate testing with mock-chronik-client (practical improvements from implementing `ecash-wallet` in `cashtab-faucet`)
[D18390](https://reviews.bitcoinabc.org/D18390) Patch the `main` entry in `package.json` to point to `dist/index.js`

# 1.0.1

[D18391](https://reviews.bitcoinabc.org/D18391) Patch README

# 1.1.0

[D18398](https://reviews.bitcoinabc.org/D18398) Accept addresses in the transaction ouputs

# 1.2.0

[D18548](https://reviews.bitcoinabc.org/D18548) Support GENESIS, SEND, and BURN for SLP_TOKEN_TYPE_MINT_VAULT

# 1.3.0

[D18551](https://reviews.bitcoinabc.org/D18551) Support GENESIS, SEND, MINT, and BURN for SLP_TOKEN_TYPE_NFT1_GROUP

# 1.4.0

[D18558](https://reviews.bitcoinabc.org/D18558) Support GENESIS, SEND, and BURN for SLP_TOKEN_TYPE_NFT1_CHILD

# 1.5.0

[D18585](https://reviews.bitcoinabc.org/D18585) Support DataAction for ALP token sends

# 2.0.0

[D18627](https://reviews.bitcoinabc.org/D18627)

-   Support intentional SLP burns for arbitrary amounts with a chained tx.
-   Support automatic updating of determined wallet utxo set on tx build() (unless user opts out, e.g. for running tests) (NB does not apply to PostageTx)
-   **_BREAKING CHANGE_** the `.broadcast()` method no longer throws, returns a `success` key with more information
-   Patch issue where SLP burns are not invalidated for including specified outputs

# 2.0.1

[D18673](https://reviews.bitcoinabc.org/D18673)

-   Type errors uncovered when using `ecash-wallet` as a dep in `ecash-agora`

# 2.1.0

[D18834](https://reviews.bitcoinabc.org/D18834)

-   Support chained txs for minting SLP NFTs without requiring a "fan-out" tx

# 2.1.1

[D18839](https://reviews.bitcoinabc.org/D18839)

-   Patch type issue in returning `SelectUtxosResult`

# 2.1.2

[D18840](https://reviews.bitcoinabc.org/D18840)

-   Export the `BuiltAction` class to support the user of `Wallet` in the `ecash-agora` `AgoraOffer` `take` method

# 2.1.3

[D18841](https://reviews.bitcoinabc.org/D18841)

-   Return sats selection strategy used to select utxos with `SelectUtxosResult`
