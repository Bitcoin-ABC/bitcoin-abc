# ecash-coinselect

An unspent transaction output (UTXO) selection module for eCash (XEC).

**WARNING:** `value` units are in satoshis.

### Installation

```bsh
$ npm i ecash-coinselect
```

### Usage

See `test/` for usage.

#### Changelog

1.0.0

-   Support collection of eCash XEC utxos for one to one p2pkh transactions.

1.0.1

-   Fixed p2pkh byte count calculations and renamed `calcByteCount` to `calcP2pkhByteCount`.

1.0.2

-   Updated `getInputUtxos` to take in an outputArray.

2.0.0

-   Deprecate `getInputUtxos`, `parseChronikUtxos`, and `calcP2pkhByteCount`
-   Implement `coinSelect` function for eCash based on the accumulative algorithm of the [coinselect](https://github.com/bitcoinjs/coinselect) library from [bitcoinjs](https://github.com/bitcoinjs)

2.0.1

-   Improvements from [diff review](https://reviews.bitcoinabc.org/D14526)

2.0.2-3

-   Dep upgrades

2.0.4

-   Add support for utxo format from in-node chronik-client [diff](https://reviews.bitcoinabc.org/D15518)

2.1.0

-   Support input param `tokenInputs` to create txs with user-specified inputs [diff](https://reviews.bitcoinabc.org/D15520)

2.1.0

-   Export new function `getMaxSendAmountSatoshis` [diff](https://reviews.bitcoinabc.org/D15555)

## License [MIT](LICENSE)
