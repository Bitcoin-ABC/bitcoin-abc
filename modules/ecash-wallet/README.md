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

## Change log

-   0.0.0 Init with constructor and `sync` method [D17773](https://reviews.bitcoinabc.org/D17773)
-   0.0.1 Add utxo getter methods `getFuelUtxos` and `getSpendableCoinbaseUtxos` [D17779](https://reviews.bitcoinabc.org/D17779)

### 1.0.0

[D17822](https://reviews.bitcoinabc.org/D17822) Add support for building and broadcasting txs, including ALP and SLP token txs. Update methods and syntax. Add preliminary support for Postage protocol.
[D18384](https://reviews.bitcoinabc.org/D18384) Add `fromMnemonic` constructor, make `Wallet` a normal export (not uniquely a default export), call `broadcastTx` using hex rawTx to facilitate testing with mock-chronik-client (practical improvements from implementing `ecash-wallet` in `cashtab-faucet`)
[D18390](https://reviews.bitcoinabc.org/D18390) Patch the `main` entry in `package.json` to point to `dist/index.js`

# 1.0.1

[D18391](https://reviews.bitcoinabc.org/D18391) Patch README
