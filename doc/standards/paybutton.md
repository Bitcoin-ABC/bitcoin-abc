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
2. A data payload
3. An optional nonce of random bytes

These txs will be "Version 0" PayButton txs. The version must be pushed as `OP_0`.

### Examples

1. A PayButton tx with 8 bytes of data and no random bytes

`6a045041590000080102030405060708`

Breaking this down

`6a` - OP_RETURN
`04` - Pushdata of the Protocol Identifier, `50415900`
`50415900` - PayButton protocol identifier, ascii `PAY`+`0x00`
`00` - Version 0, pushed as `OP_0`
`08` - pushdata for the data payload, signifying this tx has 8 bytes of data
`0102030405060708` - data payload

2. A PayButton tx with 8 bytes of data and 12 random bytes

`6a0450415900000801020304050607080c0102030405060708090a0b0c`

Breaking this down

`6a` - OP_RETURN
`04` - Pushdata of the Protocol Identifier, `50415900`
`50415900` - PayButton protocol identifier, ascii "PAY"
`00` - Version 0, pushed as `OP_0`
`08` - pushdata for the data payload, signifying this tx has 8 bytes of data
`0102030405060708` - data payload
`0c` - pushdata for the optional nonce payload, signifying this tx has 12 bytes of nonce data
`0102030405060708090a0b0c` - The 12-byte nonce

## Implementation

### Encoding and broadcasting txs

Valid PayButton transactions may be created and decoded using the `ecash-script` library published on npm. The `utxolib.script` object is also useful to create OP_RETURN txs with javascript apps. See `cashtab/src/opreturn/index` for an implementation of alias txs and Cashtab Message txs.

### Decoding txs

The `getStackArray` function in `ecash-script` is the easiest way to decode `OP_RETURN` txs.

```
const getStackArray('6a0450415900000801020304050607080c0102030405060708090a0b0c)
// ["50415900","0","0102030405060708","0102030405060708090a0b0c"]
```

## Extensibility

If future PayButton applications require additional data, this spec will be amended to describe different versions.
