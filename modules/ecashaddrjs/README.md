# eCashAddr.js: The eCash address format for Node.js and web browsers.

[![NPM](https://nodei.co/npm/ecashaddrjs.png?downloads=true)](https://nodei.co/npm/ecashaddrjs/)

TypeScript implementation for CashAddr address format for eCash (XEC). Also supports Bitcoin Cash (BCH).

Compliant with the original CashAddr [specification](https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/cashaddr.md) which improves upon [BIP 173](https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki).

## Installation

### Using NPM

```bsh
$ npm install --save ecashaddrjs
```

## Usage

See tests for detailed usage. Note that conversion to and from BTC address format is not supported in this library, but is available in `ecash-lib`.

Examples below.

### In Node.js

```javascript
const {
    encodeCashAddress,
    decodeCashAddress,
    isValidCashAddress,
    getOutputScriptFromAddress,
} = require('ecashaddrjs');
const bitcoincashAddress =
    'bitcoincash:qpadrekpz6gjd8w0zfedmtqyld0r2j4qmuj6vnmhp6';
const { prefix, type, hash } = decodeCashAddress(bitcoincashAddress);
console.log(prefix); // 'bitcoincash'
console.log(type); // 'p2pkh'
console.log(hash); // '7ad1e6c11691269dcf1272ddac04fb5e354aa0df'
console.log(encodeCashAddress('ecash', type, hash));
// 'ecash:qpadrekpz6gjd8w0zfedmtqyld0r2j4qmuthccqd8d'
console.log(isValidCashAddress(bitcoincashAddress)); // true
console.log(isValidCashAddress(bitcoincashAddress), 'bitcoincash'); // true
console.log(isValidCashAddress(bitcoincashAddress), 'ecash'); // false

// getOutputScriptFromAddress
console.log(
    getOutputScriptFromAddress(
        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
    ),
); // 76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac
```

### React

```javascript
import { encodeCashAddress, decodeCashAddress } from 'ecashaddrjs';

// Note that this specific prefix conversion use case is simplified by the Address
// class availabe in ecash-lib
function convertBitcoincashToEcash(bitcoincashAddress) {
    const { prefix, type, hash } = decodeCashAddress(bitcoincashAddress);
    const ecashAddress = encodeCashAddress('ecash', type, hash);
    return ecashAddress;
}
```

#### Change Log

-   1.1.0 - Support decoding prefixless addresses\
-   1.1.1 - Updated README to point to Bitcoin ABC monorepo\
-   1.1.2 - Updated `repository` field in `package.json` to Bitcoin ABC monorepo\
-   1.1.3 - Support string input and output for `hash`\
-   1.2.0 - Support lowercase input and output of address types, support encoding outputScript to address, support getting type and hash from an outputScript with new exported function `getTypeAndHashFromOutputScript`\
-   1.3.0 - Add `toLegacy` function to convert cashaddress format to legacy address\
-   1.4.0 - Add `isValidCashAddress` function to validate cash addresses by prefix\
-   1.4.1-6 - Fix repo README link for npmjs page\
-   1.5.0 - Add `getOutputScriptFromAddress` function to get outputScript from address
-   1.5.1 - Patch `getTypeAndHashFromOutputScript` to return type in lowercase (how chronik accepts it)
-   1.5.2 - Make input of address type case insensitive for `encode`, e.g. `p2pkh` and `P2PKH` both work
-   1.5.3 - Upgraded dependencies
-   1.5.4 - Added unit tests
-   1.5.5 - Skipped due to error in [D15400](https://reviews.bitcoinabc.org/D15400)
-   1.5.6 - Add types declaration for easy import by typescript apps
-   1.5.7 - Fix `isValidCashAddress` to allow both `undefined` or explicit `false` for no prefixes, or a user passed string as prefix
-   1.5.8 - Upgrading dependencies [D16376](https://reviews.bitcoinabc.org/D16376)
-   1.6.0 - Implement typescript [D16744](https://reviews.bitcoinabc.org/D16744)
-   1.6.1 - Replace `Buffer` with `Uint8Array` and stop using `webpack` to build [D17170](https://reviews.bitcoinabc.org/D17170)
-   1.6.2 - Lint to monorepo standards [D17183](https://reviews.bitcoinabc.org/D17183)

2.0.0 [D17269](https://reviews.bitcoinabc.org/D17269)

-   Remove all dependencies
-   Remove `toLegacy`. This is now available in `ecash-lib`
-   Remove `chronikReady` param and always return `hash` as a hex string
-   Remove support for uppercase address type inputs 'P2PKH' and 'P2SH'
-   New function `getOutputScriptFromTypeAndHash`
-   Remove validation against accepted prefix types
