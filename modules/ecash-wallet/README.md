# ecash-wallet

A production-ready wallet class for building and broadcasting eCash (XEC) txs

## Use

Install with `npm` (when published).

`npm i ecash-wallet`

Import. Create your `Wallet` and use methods.

```
import Wallet from "ecash-wallet";

const wallet = Wallet.fromSk(sk, chronik);
```

See tests for detailed methods.

## Change log

-   0.0.0 Init with constructor and `sync` method [D17773](https://reviews.bitcoinabc.org/D17773)
-   0.0.1 Add utxo getter methods `getFuelUtxos` and `getSpendableCoinbaseUtxos` [D17779](https://reviews.bitcoinabc.org/D17779)
-   1.0.0 Add support for building and broadcasting txs, including ALP and SLP token txs. Update methods and syntax. Add preliminary support for Postage protocol. [D17822](https://reviews.bitcoinabc.org/D17822)
