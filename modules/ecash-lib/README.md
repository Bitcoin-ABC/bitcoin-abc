# ecash-lib

Library for [eCash](https://e.cash) transaction building.

-   Compatible: Works on the browser using webpack, on NodeJS, jest etc.
-   Fast: Accelerated using the highly optimized secp256k1 library compiled to WebAssembly
-   Simple to use: Describe the tx to build in one TxBuilder object, and build the tx with just one `sign` call
-   SLP/ALP enabled: Functions to build the SLP/ALP eMPP scripts
-   Flexible: The "Signatory" mechanism can accommodate anything from simple wallet transfers to complex Script covenants, e.g. eCash Agora
-   Schnorr: eCash lib supports Schnorr and ECDSA signatures
-   Precise leftover ("change") computation: The tx size estimator will be exact for Schnorr signatures and very close for ECDSA signatures, even for complex scripts

## Usage

This library works for both browser and NodeJS.

### Installation

`npm install --save ecash-lib`

### Setup

To use this library, you first have to initialize the WebAssembly module:

```ts
import { initWasm } from 'ecash-lib';
await initWasm();
```

After that, to sign signatures, you need an "Ecc" instance:

```ts
import { Ecc } from 'ecash-lib';
const ecc = new Ecc();
```

**Note: You should only call this function once, as it's fairly expensive to setup, it internally precomputes some elliptic curve field elements, which takes some time**

### Usage

Now you're ready to sign your first transactions:

```ts
import {
    Ecc,
    P2PKHSignatory,
    Script,
    TxBuilder,
    fromHex,
    initWasm,
    shaRmd160,
    toHex,
} from 'ecash-lib';

// Download and compile WebAssembly
await initWasm();
// Build a signature context for elliptic curve cryptography (ECC)
const ecc = new Ecc();
const walletSk = fromHex(
    'e6ae1669c47d092eff3eb652bea535331c338e29f34be709bc4055655cd0e950',
);
const walletPk = ecc.derivePubkey(walletSk);
const walletPkh = shaRmd160(walletPk);
const walletP2pkh = Script.p2pkh(walletPkh);
// TxId with unspent funds for the above wallet
const walletUtxo = {
    txid: '0000000000000000000000000000000000000000000000000000000000000000',
    outIdx: 0,
};
// Tx builder
const txBuild = new TxBuilder({
    inputs: [
        {
            inputs: {
                prevOut: walletUtxo,
                signData: {
                    value: 1000,
                    outputScript: walletP2pkh,
                },
            },
            signatory: P2PKHSignatory(walletSk, walletPk, ALL_BIP143),
        },
    ],
    outputs: [
        {
            value: 0,
            script: new Script(fromHex('6a68656c6c6f')),
        },
        walletP2pkh,
    ],
});
const tx = txBuild.sign(ecc, 1000, 546);
const rawTx = tx.ser();
console.log(toHex(rawTx));
```

## Changelog

-   0.1.1 - Validation that feePerKb is an integer
-   0.1.2 - Upgrade dependencies [D16373](https://reviews.bitcoinabc.org/D16373)
-   0.1.3 - Export `slpAmount` function [D16379](https://reviews.bitcoinabc.org/D16379)
