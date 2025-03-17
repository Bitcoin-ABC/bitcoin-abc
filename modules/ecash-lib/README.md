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

### Usage

Here's how to sign your first transaction:

```ts
import {
    Ecc,
    P2PKHSignatory,
    Script,
    TxBuilder,
    fromHex,
    shaRmd160,
    toHex,
    ALL_BIP143,
} from 'ecash-lib';

const walletSk = fromHex(
    'e6ae1669c47d092eff3eb652bea535331c338e29f34be709bc4055655cd0e950',
);
const walletPk = new Ecc().derivePubkey(walletSk);
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
            input: {
                prevOut: walletUtxo,
                signData: {
                    sats: 1000n,
                    outputScript: walletP2pkh,
                },
            },
            signatory: P2PKHSignatory(walletSk, walletPk, ALL_BIP143),
        },
    ],
    outputs: [
        {
            sats: 0n,
            script: new Script(fromHex('6a68656c6c6f')),
        },
        walletP2pkh,
    ],
});
const tx = txBuild.sign({ feePerKb: 1000n, dustSats: 546n });
const rawTx = tx.ser();
console.log(toHex(rawTx));
```

## Changelog

-   0.1.1 - Validation that feePerKb is an integer
-   0.1.2 - Upgrade dependencies [D16373](https://reviews.bitcoinabc.org/D16373)
-   0.1.3 - Export `slpAmount` function [D16379](https://reviews.bitcoinabc.org/D16379)
-   0.2.0 - Add `Script.fromAddress` method to convert cashaddr addresses to `Script`
-   0.2.1 - Fix fee estimation for signatories that depend on tx outputs [D16673](https://reviews.bitcoinabc.org/D16673)
-   1.0.0 - **(Breaking change)** Modify `GenesisInfo` so that `auth` and `data` types match [D17194](https://reviews.bitcoinabc.org/D17194)
-   1.0.1 - Include `ecashaddrjs` and `chronik-client` installations from `npmjs` instead of local, to prevent need for peer dependencies [D17215](https://reviews.bitcoinabc.org/D17215)
-   1.1.0 - Add support for the original pre-UAHF Bitcoin signatures, so we can sign transactions for other blockchains like BTC/DOGE/... [D17255](https://reviews.bitcoinabc.org/D17255)
-   1.2.0 - Add `Address` class for cashaddr and legacy addresses. [D17269](https://reviews.bitcoinabc.org/D17269)
-   1.2.1 - Patch type check causing txBuilder txs using change to fail in NodeJS environments [D17461](https://reviews.bitcoinabc.org/D17461)
-   1.3.0 - Add `toHex()` method to `Script` to allow simple conversion to hex string [D17527](https://reviews.bitcoinabc.org/D17527)
-   1.4.0 - Add `HdNode`, `entropyToMnemonic`, `mnemonicToEntropy` and `mnemonicToSeed` to complete wallet functionality [D17619](https://reviews.bitcoinabc.org/D17619)
-   1.4.1 - Patch import in `mnemonic.ts` [D17621](https://reviews.bitcoinabc.org/D17621)
-   1.5.0 - Support custom WASM URL and module [D17622](https://reviews.bitcoinabc.org/D17622)
-   1.5.1 - `Address.withPrefix()` returns same prefix if unchanged (instead of throwing an error) [D17623](https://reviews.bitcoinabc.org/D17623)
-   2.0.0 - Remove `initWasm`, auto-load the WebAssembly instead. Remove unneeded `ecc` parameters, esp. in `TxBuilder.sign` and `HdNode.fromSeed` [D17639](https://reviews.bitcoinabc.org/D17639) [D17640](https://reviews.bitcoinabc.org/D17640)
-   2.1.0 - Add `signRecoverable` and `recoverSig` to `Ecc` [D17667](https://reviews.bitcoinabc.org/D17667)
-   3.0.0 - Improve types and shapes in line with chronik proto updates [D17650](https://reviews.bitcoinabc.org/D17650)
-   3.1.0 - Add methods for signing and verifying messages [D17778](https://reviews.bitcoinabc.org/D17778)
-   3.2.0 - Add method for parsing pushes from an EMPP OP_RETURN [D18057](https://reviews.bitcoinabc.org/D18057)
-   4.0.0 - Add constants and types to support `ecash-wallet` [D17822](https://reviews.bitcoinabc.org/D17822)
