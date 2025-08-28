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
    [] SLP_TOKEN_TYPE_MINT_VAULT SEND and BURN actions  
    [] SLP_TOKEN_TYPE_NFT1_GROUP
    [] SLP_TOKEN_TYPE_NFT1_CHILD
    [] BURN txs for arbitrary amounts using BURN method (intentional burn, not SEND)
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
