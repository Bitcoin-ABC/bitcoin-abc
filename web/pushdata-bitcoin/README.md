# pushdata-bitcoin

[![NPM Package](https://img.shields.io/npm/v/pushdata-bitcoin.svg?style=flat-square)](https://www.npmjs.org/package/pushdata-bitcoin)
[![Build Status](https://img.shields.io/travis/bitcoinjs/pushdata-bitcoin.svg?branch=master&style=flat-square)](https://travis-ci.org/bitcoinjs/pushdata-bitcoin)
[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Encode/decode value as bitcoin `OP_PUSHDATA` integer

## Example

```javascript
var pushdata = require('pushdata-bitcoin');

var i = 120;
var buffer = new Buffer(pushdata.encodingLength(i));

pushdata.encode(buffer, i);
```

## LICENSE [MIT](LICENSE)
