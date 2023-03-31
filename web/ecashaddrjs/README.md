# eCashAddr.js: The eCash address format for Node.js and web browsers.

[![NPM](https://nodei.co/npm/ecashaddrjs.png?downloads=true)](https://nodei.co/npm/ecashaddrjs/)

JavaScript implementation for CashAddr address format for eCash.

Compliant with the original CashAddr [specification](https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/cashaddr.md) which improves upon [BIP 173](https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki).

## Installation

### Using NPM

```bsh
$ npm install --save ecashaddrjs
```

### Manually

You may also download the distribution file manually and place it within your third-party scripts directory: [dist/cashaddrjs.min.js](https://unpkg.com/ecashaddrjs/dist/cashaddrjs.min.js).

## Usage

Convert a `bitcoincash:` prefixed address to an `ecash:` prefixed address

### In Node.js

```javascript
const ecashaddr = require('ecashaddrjs');
const bitcoincashAddress =
    'bitcoincash:qpadrekpz6gjd8w0zfedmtqyld0r2j4qmuj6vnmhp6';
const { prefix, type, hash } = ecashaddr.decode(bitcoincashAddress);
console.log(prefix); // 'bitcoincash'
console.log(type); // 'P2PKH'
console.log(hash); // Uint8Array [ 118, 160, ..., 115 ]
console.log(ecashaddr.encode('ecash', type, hash));
// 'ecash:qpadrekpz6gjd8w0zfedmtqyld0r2j4qmuthccqd8d'
```

### Working with chronik-client in Node.js

[chronik](https://www.npmjs.com/package/chronik-client) is the reference indexer for eCash. It queries the blockchain using address hash160 and type parameters.

The `type` and `hash` parameters can be returned in a format ready for chronik by calling `cashaddr.decode(address, true)`

```javascript
const ecashaddr = require('ecashaddrjs');
const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient('https://chronik.be.cash/xec');
const chronikQueryAddress = 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035';
const { prefix, type, hash } = ecashaddr.decode(chronikQueryAddress, true);
console.log(prefix); // 'ecash'
console.log(type); // 'p2pkh' (instead of 'P2PKH', returned without the 'true' flag)
console.log(hash); // '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d' (instead of Uint8Array [ 149, 241, ..., 29 ], returned without the 'true' flag)
console.log(ecashaddr.encode('ecash', type, hash)); // encode supports chronik output inputs
// 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035'
// use chronik client to get a page of address tx history
const history = await chronik
    .script(type, hash)
    .history(/*page=*/ 0, /*page_size=*/ 10);
```

### React

```javascript
import cashaddr from 'ecashaddrjs';

function convertBitcoincashToEcash(bitcoincashAddress) {
    /* NOTE
  This function assumes input parameter 'bitcoincashAddress' is a valid bitcoincash: address
  cashaddr.decode() will throw an error if 'bitcoincashAddress' lacks a prefix
  */
    const { prefix, type, hash } = cashaddr.decode(bitcoincashAddress);
    const ecashAddress = cashaddr.encode('ecash', type, hash);
    return ecashAddress;
}
```

### Browser

```html
<html>
    <head>
        <script src="https://unpkg.com/ecashaddrjs/dist/cashaddrjs.min.js"></script>
    </head>
    <body>
        <script>
            function convertBitcoincashToEcash(bitcoincashAddress) {
                /* NOTE
    This function assumes input parameter 'bitcoincashAddress' is a valid bitcoincash: address
    cashaddr.decode() will throw an error if 'bitcoincashAddress' lacks a prefix
    */
                const { prefix, type, hash } =
                    cashaddr.decode(bitcoincashAddress);
                const ecashAddress = cashaddr.encode('ecash', type, hash);
                return ecashAddress;
            }
            const eCashAddr = convertBitcoincashToEcash(
                'bitcoincash:qpadrekpz6gjd8w0zfedmtqyld0r2j4qmuj6vnmhp6',
            );
            console.log(eCashAddr);
            // ecash:qpadrekpz6gjd8w0zfedmtqyld0r2j4qmuthccqd8d
        </script>
    </body>
</html>
```

#### Script Tag

You may include a script tag in your HTML and the `ecashaddr` module will be defined globally on subsequent scripts.

```html
<html>
    <head>
        ...
        <script src="https://unpkg.com/ecashaddrjs/dist/cashaddrjs.min.js"></script>
    </head>
    ...
</html>
```

#### jsFiddle

https://jsfiddle.net/zghd6c2y/

#### Change Log

1.1.0 - Support decoding prefixless addresses
1.1.1 - Updated README to point to Bitcoin ABC monorepo
1.1.2 - Updated `repository` field in `package.json` to Bitcoin ABC monorepo
1.1.3 - Support string input and output for `hash`
1.2.0 - Support lowercase input and output of address types
