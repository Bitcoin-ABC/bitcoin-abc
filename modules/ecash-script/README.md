## ecash-script

A JS library to support parsing script for ecash app development.

### Use

As of 1.0.0, available methods are limited to parsing OP_RETURN scripts.

These methods require input to be an object, i.e. `{remainingHex: '<string>'}`. Methods will modify the object in place such that `remainingHex` has consumed characters removed.

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
// 2e786563
```

See `test/script.js` for additional examples.
