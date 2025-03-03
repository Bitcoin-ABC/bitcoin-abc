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

-   0.0.0 Init with constructor and `sync` method
