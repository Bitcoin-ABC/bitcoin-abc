# minimaldata

[![NPM Package](https://img.shields.io/npm/v/minimaldata.svg?style=flat-square)](https://www.npmjs.org/package/minimaldata)
[![Build Status](https://img.shields.io/travis/bitcoinjs/minimaldata.svg?branch=master&style=flat-square)](https://travis-ci.org/bitcoinjs/minimaldata)

Following BIP62.3, this module validates that a script uses only minimal data pushes.

## Example

```javascript
var minimaldata = require('minimaldata');

// OP_PUSHDATA4, 1 byte
var script = new Buffer('4e0100000000', 'hex');
console.log(minimaldata(script));
// => false

script = new Buffer('0101', 'hex');
console.log(minimaldata(script));
// => true
```

## LICENSE [MIT](LICENSE)
