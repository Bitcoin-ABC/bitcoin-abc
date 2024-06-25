## ecash-script

A JS library to support parsing script for ecash app development.

### Use

As of 2.1.0, available methods are limited to parsing OP_RETURN scripts.

These methods require input to be an object, i.e. `{remainingHex: '<string>'}`. Methods will modify the object in place such that `remainingHex` has consumed characters removed.

`getStackArray`
Return an array of pushes from an OP_RETURN outputScript

```
getStackArray('6a042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6')
// ['2e786563', '00', '333333', '0076458db0ed96fe9863fc1ccec9fa2cfab884b0f6']
```

`consume`
Manually consume a user-specified number of bytes from the stack.

```
consume({remainingHex: '6a'}, 1)
// 6a
consume({remainingHex: '4c04'}, 2)
// 4c04
```

`consumeNextPush`
Provide the next push from a given OP_RETURN stack. Stack must be provided with `6a` removed.

```
consumeNextPush({remainingHex:'042e786563'})
// {data: 2e786563, pushedWith: '04'}
```

`swapEndianness`
Convert a string of hex bytes in little-endian order (e.g. one found after OP_PUSHDATA2 or OP_PUSHDATA4) to a string of hex bytes in big-endian order or vice-versa.

```
swapEndianness('44332211')
// 11223344
```

See `test/` for additional usage examples.

### Change log

1.0.0 Initial support for OP_RETURN parsing with functions `consume` and `consumeNextPush`
1.1.0 New functions `swapEndianness` and `isHexString`
2.0.0 Modify `consumeNextPush` to return object `{data, pushedWith}` instead of string `data`
2.1.0 New function `getStackArray` to return an array of hex pushes from an OP_RETURN outputScript
2.1.1 Patch export bug for `getStackArray`
2.1.2 Update dependencies [D14676](https://reviews.bitcoinabc.org/D14676)
2.1.3 Update dependencies [D16377](https://reviews.bitcoinabc.org/D16377)
