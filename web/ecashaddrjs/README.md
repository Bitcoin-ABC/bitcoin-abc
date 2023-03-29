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
