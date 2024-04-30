# ecash-agora: Non-interactive XEC -> token swaps using Script

## What's an "Agora"?

The agora (ἀγορά) was a central public space in ancient Greek city-states, and means "market" in modern Greek. The eCash Agora is similar in that sense, it's a protocol on eCash that allows anyone to offer their tokens in exchange for XEC.

## Is Agora a DEX?

Agora is a NEX, a "non-custodial exchange"; in contrast to e.g. Uniswap or other DEXes that are common on ETH, Agora doesn't pool any funds, but everyone offering tokens has them in their own independently controlled UTXOs.

You don't send your tokens to a central smart contract, you keep them in your wallet but expose them for others to take if they meet certain criteria.

In that sense, "exchange" might even be a misnomer, as there's no special server or platform required, it's using the P2P network directly, and trades are accepted on and broadcast from the user's own wallets.

## How can it be used?

eCash Agora allows users to lock their SLP/ALP tokens in a special UTXO, which behaves similar to to a "virtual vending machine", where other's can "insert" XEC and get tokens out.

For example, Alice can lock 1000 GRUMPY into an output with a Agora P2SH Script, and in the rules of the Script it requires others to send 20000 XEC to an output with an address controlled by Alice.

So, if Bob has 20000 XEC, he can send the 1000 GRUMPY to his own address by spending Alice's output with a transaction that sends the 20000 XEC to Alice. And the Agora Script enforces that this is handled correctly.

## Why does it work?

We can use Bitcoin's Script language to put spending conditions on a UTXO, for example a normal P2PKH requires us to provide a matching public key + signature, like this:

`OP_DUP OP_HASH160 <public key hash> OP_EQUALVERIFY OP_CHECKSIG`

These Scripts are little programs that a spender has to make happy (i.e. make them result in producing a "true" result) in order to spend them.

eCash has the ability to put conditions on a transaction spending a UTXO for a while already, you can read about them [here](https://read.cash/@pein/bch-covenants-with-spedn-4a980ed3).

**We can use this to constrain that an output can only be spent if it sends some XEC to a specific address, which is essentially all that Agora does**

At the end, it's an `OP_EQUALVERIFY` operation that will fail if someone tries to get the tokens without sending the required tokens to the required address.

## How does it work?

### Transaction

A transaction will look roughly like this, if Bob accepts all available tokens:
| Inputs | Outputs |
|--------|---------|
| Value: dust<br> Token: 1000 GRUMPY<br> Script: Alice's Agora P2SH | Value: 0<br> Script: SLP OP_RETURN |
| Value: 20000 XEC + fee<br> Script: Bob's P2PKH Script | Value: 20000 XEC<br> Script: Alice's P2PKH Script |
| | Value: dust<br> Token: 1000 GRUMPY<br> Script: Bob's P2PKH Script |

You can see that after the transaction, Alice has 20000 XEC and Bob has 1000 Grumpy.

The Agora P2SH script will ensure that the transaction has the shape as described above.

## Usage

You can create a "one shot" offer (one that offers all or nothing) using `AgoraOneshot`, here to sell an SLP NFT:

```ts
const enforcedOutputs: TxOutput[] = [
    { value: 0, script: slpSend(tokenId, SLP_NFT1_CHILD, [0, 1]) },
    { value: 80000, script: sellerP2pkh },
];
const agoraOneshot = new AgoraOneshot({
    enforcedOutputs,
    cancelPk: sellerPk,
});
const agoraScript = agoraOneshot.script();
const agoraP2sh = Script.p2sh(shaRmd160(agoraScript.bytecode));
```

A buyer can then accept this using `AgoraOneshotSignatory`:

```ts
const txBuilder = new TxBuilder({
    version: 2,
    inputs: [
        {
            input: {
                prevOut: {
                    txid: offerTxid,
                    outIdx: 1,
                },
                signData: {
                    value: 546,
                    redeemScript: agoraScript,
                },
            },
            signatory: AgoraOneshotSignatory(
                buyerSk,
                buyerPk,
                enforcedOutputs.length,
            ),
        },
        {
            input: {
                prevOut: {
                    txid: buyerSatsTxid,
                    outIdx: 0,
                },
                signData: {
                    value: 90000,
                    outputScript: buyerP2pkh,
                },
            },
            signatory: P2PKHSignatory(buyerSk, buyerPk, ALL_BIP143),
        },
    ],
    outputs: [
        {
            value: 0,
            script: slpSend(tokenId, SLP_NFT1_CHILD, [0, 1]),
        },
        { value: 80000, script: sellerP2pkh },
        { value: 546, script: buyerP2pkh },
    ],
});
const acceptTx = txBuilder.sign(ecc);
await chronik.broadcastTx(acceptTx.ser());
```
