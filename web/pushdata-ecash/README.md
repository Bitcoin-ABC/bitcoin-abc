# pushdata-ecash

[![NPM Package](https://img.shields.io/npm/v/pushdata-bitcoin.svg?style=flat-square)](https://www.npmjs.org/package/pushdata-ecash)

Encode/decode value as ecash `OP_PUSHDATA` integer

## Example

```javascript
var pushdata = require('pushdata-ecash');

var i = 120;
var buffer = new Buffer(pushdata.encodingLength(i));

pushdata.encode(buffer, i);
```

## LICENSE [MIT](LICENSE)
