# ecash-lib

Library for eCash transaction building.

## Usage

```ts
import { Tx, Script, fromHex, toHex } from 'ecash-lib';

const tx = new Tx({
    inputs: [
        {
            prevOut: {
                txid: new Uint8Array(32),
                outIdx: 0,
            },
            script: new Script(),
            sequence: 0xffffffff,
        },
    ],
    outputs: [
        {
            value: 0,
            script: new Script(fromHex('6a68656c6c6f')),
        },
        {
            value: 546,
            script: new Script(
                fromHex('a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087'),
            ),
        },
    ],
});

const rawTx = tx.ser();
console.log(toHex(rawTx));
```
