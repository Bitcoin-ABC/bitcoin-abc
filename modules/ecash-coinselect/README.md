# ecash-coinselect: An eCash utxo selection utility.

JavaScript implementation of an unspent transaction output (UTXO) selection module for eCash and compatible with the Chronik indexer.

There are a number of possible approaches for selecting which utxos to use to build a transaction.

These approaches include:

1. Indiscriminately collecting enough utxos to cover the sending amount plus fees
2. Collecting the biggest utxos first
3. Consolidating dust by using the smallest utxos first
4. Using utxos most appropriately sized for the given tx

This library is currently utilizing the first approach which collects utxos until the aggregate value can cover the send amount plus the tx fee. Subsequent updates will cater for the other alternate coin selection approaches.

## Installation

### Using NPM

```bsh
$ npm install --save ecash-coinselect
```

## Usage

-   Get enough XEC utxos to cover a send amount plus fees based on a utxo set for a single p2pkh address.

```javascript
const coinselect = require('ecash-coinselect');
// Retrieve utxos from Chronik
// const chronikUtxos = await chronik.script("p2pkh", hash160).utxos();

// `outputArray` should consist of an array of intended outputs for the transaction
// containing an address and value properties. The value is in satoshis.
const outputArray = [
    {
        address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
        value: 900, // 9 XEC
    },
];
const collectedXecUtxos = coinselect.getInputUtxos(chronikUtxos, outputArray);
console.log(collectedXecUtxos);
// "inputs": [
//    {
//      "outpoint": {
//          "txid": "1b59feeb756e59c8df26af0f636dfb7c6fd466743539617cee49d60ffda02994",
//          "outIdx": 0
//       },
//       "blockHeight": 799480,
//       "isCoinbase": false,
//       "value": "600",
//       "network": "XEC"
//    },
//    {
//      "outpoint": {
//          "txid": "1b59feeb756e59c8df26af0f636dfb7c6fd466743539617cee49d60ffda02994",
//          "outIdx": 1
//       },
//       "blockHeight": 799480,
//       "isCoinbase": false,
//       "value": "38052",
//       "network": "XEC"
//    }
// ],
// "changeAmount": 500,
// "txFee": 374,
// };
```

-   Parse a utxo set returned from Chronik's [.script().utxo()](https://www.npmjs.com/package/chronik-client?activeTab=readme) API and separate the XEC utxos from the SLP utxos.

```javascript
const coinselect = require('ecash-coinselect');
// Retrieve utxos from Chronik
// const chronikUtxos = await chronik.script("p2pkh", hash160).utxos();
const parsedUtxos = coinselect.parseChronikUtxos(parseChronikUtxos);
console.log(parsedUtxos);
// output below for a wallet with only XEC utxos and no SLP utxos
//{
//  "xecUtxos": [{
//    "outpoint": {
//      "txid": "1b59feeb756e59c8df26af0f636dfb7c6fd466743539617cee49d60ffda02994",
//      "outIdx": 1
//    },
//    "blockHeight": 799480,
//    "isCoinbase": false,
//    "value": "38052",
//    "network": "XEC"
//  }],
//  "slpUtxos": []
//}
```

-   Calculate a p2pkh transaction byte count based on inputs and outputs.

```javascript
const coinselect = require('ecash-coinselect');
const byteCount = coinselect.calcP2pkhByteCount(
    5, // inputs
    2, // outputs
);
console.log(byteCount); // 818
```

#### Change Log

1.0.2 - Updated `getInputUtxos` to take in an outputArray.

1.0.1 - Fixed p2pkh byte count calculations and renamed `calcByteCount` to `calcP2pkhByteCount`.

1.0.0 - Support collection of eCash XEC utxos for one to one p2pkh transactions.
