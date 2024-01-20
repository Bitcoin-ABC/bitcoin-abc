# PayButton

A spec for encoding data with PayButton txs

## Background

WebApps or payment requesters will often want more data in a transaction than only inputs and outputs.

An app developer might want

-   different types of transactions related to gameplay events
-   To include invoice numbers
-   To include nonces to distinguish between different received payments of the same amount
-   etc

## Approach

Initial requirements

1. A version byte to support future extensibility
2. A data payload (utf8 encoded)
3. A nonce of eight random bytes

All fields are required. However, the data payload or the nonce may be empty. An empty data payload and an empty nonce are both signified by `OP_0`.

These txs will be "Version 0" PayButton txs. The version must be pushed as `OP_0`.

### Examples

1. A PayButton tx with 12 bytes of data and no nonce of 8 random bytes

`6a0450415900000c0102030405060708090a0b0c00`

Breaking this down:

`6a` - OP_RETURN
`04` - Pushdata of the Protocol Identifier, `50415900`
`50415900` - PayButton protocol identifier, ascii `PAY`+`0x00`
`00` - Version 0, pushed as `OP_0`
`0c` - pushdata for the data payload, signifying this tx has 12 bytes of utf8-encoded data
`0102030405060708090a0b0c` - data payload
`00` - OP_0 in last position signifies there is no 8-byte nonce

2. A PayButton tx with 12 bytes of data and 8-byte nonce

`6a0450415900000c0102030405060708090a0b0c080102030405060708`

Breaking this down:

`6a` - OP_RETURN
`04` - Pushdata of the Protocol Identifier, `50415900`
`50415900` - PayButton protocol identifier, ascii `PAY`+`0x00`
`00` - Version 0, pushed as `OP_0`
`0c` - pushdata for the data payload, signifying this tx has 12 bytes of utf8-encoded data
`0102030405060708090a0b0c` - data payload (utf8 encoded)
`08` - pushdata for the optional nonce payload, signifying this tx has 8 bytes of nonce data
`0102030405060708` - Included optional 8-byte nonce

3. A PayButton tx with no data and 8-byte nonce

`6a04504159000000080102030405060708`

Breaking this down:

`6a` - OP_RETURN
`04` - Pushdata of the Protocol Identifier, `50415900`
`50415900` - PayButton protocol identifier, ascii `PAY`+`0x00`
`00` - Version 0, pushed as `OP_0`
`00` - There is no data associated with this PayButton tx
`08` - pushdata for the optional nonce payload, signifying this tx has 8 bytes of nonce data
`0102030405060708` - Included optional 8-byte nonce

4. A PayButton tx with no data and no nonce

`6a0450415900000000`

Breaking this down:

`6a` - OP_RETURN
`04` - Pushdata of the Protocol Identifier, `50415900`
`50415900` - PayButton protocol identifier, ascii `PAY`+`0x00`
`00` - Version 0, pushed as `OP_0`
`00` - There is no data associated with this PayButton tx
`00` - There is no nonce associated with this PayButton tx

## Implementation

### Encoding and broadcasting txs

Valid PayButton transactions may be created and decoded using the `ecash-script` library published on npm. The `utxolib.script` object is also useful to create OP_RETURN txs with javascript apps. See `cashtab/src/opreturn/index` for an implementation of alias txs and Cashtab Message txs.

### Decoding txs

The `getStackArray` function in `ecash-script` is the easiest way to decode `OP_RETURN` txs.

```
const getStackArray('6a0450415900000c0102030405060708090a0b0c080102030405060708)
// ["50415900","0","0102030405060708090a0b0c","0102030405060708"]
```

## Extensibility

If future PayButton applications require additional data, this spec will be amended to describe different versions.
