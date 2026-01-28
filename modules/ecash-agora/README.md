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
    { sats: 0n, script: slpSend(tokenId, SLP_NFT1_CHILD, [0n, 1n]) },
    { sats: 80000n, script: sellerP2pkh },
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
                    sats: 546n,
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
                    sats: 90000n,
                    outputScript: buyerP2pkh,
                },
            },
            signatory: P2PKHSignatory(buyerSk, buyerPk, ALL_BIP143),
        },
    ],
    outputs: [
        {
            sats: 0n,
            script: slpSend(tokenId, SLP_NFT1_CHILD, [0n, 1n]),
        },
        { sats: 80000n, script: sellerP2pkh },
        { sats: 546n, script: buyerP2pkh },
    ],
});
const acceptTx = txBuilder.sign();
await chronik.broadcastTx(acceptTx.ser());
```

## Development

### Running the integration tests locally

1. Build the node software from source with chronik and plugins enabled

```
mkdir build/
cd build/
cmake -GNinja .. -DBUILD_CHRONIK=ON -DBUILD_CHRONIK_PLUGINS=ON
ninja
```

2. You may need to [adjust](https://stackoverflow.com/questions/72409563/unsupported-hash-type-ripemd160-with-hashlib-in-python/72508879#72508879) your `openssl` settings

3. Specify the location of your built chronik-with-plugins node with the `BUILD_DIR` env variable, e.g.

Running from `bitcoin-abc/modules/ecash-agora` if your build dir is `bitcoin-abc/build/`:

`BUILD_DIR="${PWD}/../../build" npm run integration-tests`

## Changelog

- 0.1.0 - MVP [D16087](https://reviews.bitcoinabc.org/D16087) [D16111](https://reviews.bitcoinabc.org/D16111)
- 0.1.1 - Upgrading dependencies [D16374](https://reviews.bitcoinabc.org/D16374)

### 0.2.0

- Add agora.py plugin [D16544](https://reviews.bitcoinabc.org/D16544)
- Plugin support [D16745](https://reviews.bitcoinabc.org/D16745)|[D16753](https://reviews.bitcoinabc.org/D16753)|[D16754](https://reviews.bitcoinabc.org/D16754)|[D16755](https://reviews.bitcoinabc.org/D16755)
- Improve test framework [D16741](https://reviews.bitcoinabc.org/D16741)
- Websocket subscriptions [D16845](https://reviews.bitcoinabc.org/D16845)
- Build script for partial SLP offers [D16743](https://reviews.bitcoinabc.org/D16743)
- Approximation logic for partial offers [D16735](https://reviews.bitcoinabc.org/D16735)
- Add `historicOffers` function to `Agora` [D16819](https://reviews.bitcoinabc.org/D16819)
- Patch burned tokens issue in agora partial scripts [D16821](https://reviews.bitcoinabc.org/D16821)
- Export partial modules [D16820](https://reviews.bitcoinabc.org/D16820)
- Syntax linting [D16919](https://reviews.bitcoinabc.org/D16919)|[D16928](https://reviews.bitcoinabc.org/D16928)
- README patch for local integration testing [D16952](https://reviews.bitcoinabc.org/D16952)
- Patch minAcceptedTokens() to return true minimum (prepared value) [D16920](https://reviews.bitcoinabc.org/D16920)
- Add validation to acceptTx method of AgoraPartial to prevent creation of unspendable offers [D16944](https://reviews.bitcoinabc.org/D16944)
- Export `scriptOps` helper function [D16972](https://reviews.bitcoinabc.org/D16972)
- Improve approximation for USD-esque tokens [D16995](https://reviews.bitcoinabc.org/D16995)
- Update tsconfig to support use in nodejs [D17019](https://reviews.bitcoinabc.org/D17019)
- Monorepo linting [D17072](https://reviews.bitcoinabc.org/D17072)
- CI publishing [D17243](https://reviews.bitcoinabc.org/D17243)

### 0.3.0

- Add `TakenInfo` in `historicOffers` method to support parsing historic Agora offers [D17422](https://reviews.bitcoinabc.org/D17422)

### 0.3.1

- Do not allow creation of unacceptable agora partials [D17517](https://reviews.bitcoinabc.org/D17517)

### 0.3.2

- Improve offer checks in `historicOffers` [D17630](https://reviews.bitcoinabc.org/D17630)

### 0.4.0

- Add `getAgoraPartialAcceptFuelInputs` and `getAgoraCancelFuelInputs` [D17637](https://reviews.bitcoinabc.org/D17637)

### 1.0.0

- Remove unneeded `ecc` param from various functions [D17640](https://reviews.bitcoinabc.org/D17640)

### 1.0.1

- Do not validate for unspendable offer creation when we calculate fee in `acceptFeeSats()` [D17648](https://reviews.bitcoinabc.org/D17648)

### 2.0.0

- Improve types and shapes in line with chronik proto updates [D17650](https://reviews.bitcoinabc.org/D17650)
- Introduce 'atoms' as term for base unit of tokens. Implement in lib. The term "token" is ambiguous as it is not clear that we are talking about base tokens.

### 2.0.1

- Ensure special case of agora partial offers where `minAcceptedAtoms` should equal `offeredAtoms` will work out this way [D17776](https://reviews.bitcoinabc.org/D17776)

### 2.1.0

- Add support for "UNKNOWN" token protocol type in chronik-client [D18155](https://reviews.bitcoinabc.org/D18155)

### 2.2.0

- Add `src/actions.ts` to support preparing payment Actions for `ecash-wallet`, and add `actions.test.ts` to show implementation [D18673](https://reviews.bitcoinabc.org/D18673)

### 2.3.0

- Expose precision param to allow app creation of 64-bit int offers [D18829](https://reviews.bitcoinabc.org/D18829)

### 2.4.0

- Add new `take` method to `AgoraOffer` that will automatically build and broadcast an agora acceptTx given a `Wallet` from `ecash-wallet` [D18833](https://reviews.bitcoinabc.org/D18833)

### 2.5.0

- Add new `cancel` method to `AgoraOffer` that will automatically build and broadcast an agora cancelTx given a `Wallet` from `ecash-wallet` [D18842](https://reviews.bitcoinabc.org/D18842)

### 2.5.1

- Improve flaky behavior by better organizing sats for the test taker wallet [D18846](https://reviews.bitcoinabc.org/D18846)

### 2.5.2

- Enforce `take()` method accepting agora offer at calling wallet param [D18846](https://reviews.bitcoinabc.org/D18846)

### 2.6.0

- Add new `relist` method to `AgoraOffer` that will automatically build and broadcast an agora tx that cancels an existing offer and relists the same token at new terms (updated price, quantity, and/or other params) [D18847](https://reviews.bitcoinabc.org/D18847)

### 2.6.1

- `ecash-wallet` is now a dependency and not a dev dependency, and must be specified as such for apps that use `ecash-agora` to avoid missing dep errors. [D18852](https://reviews.bitcoinabc.org/D18852)

### 2.6.2

- Patch deployment to make sure we actually get our dependencies installed [D18854](https://reviews.bitcoinabc.org/D18854)

### 2.6.3

- Another deployment patch; make sure we pin our versions to latest instead of using "latest" [D18857](https://reviews.bitcoinabc.org/D18857)

### 2.6.4

- Publish to reflect updated `ecash-wallet` and `ecash-lib` deps [D18921](https://reviews.bitcoinabc.org/D18921)

### 2.6.5

- Publish to catch updated `ecash-wallet` dep [D18925](https://reviews.bitcoinabc.org/D18925)

### 2.6.6

- Publish to catch updated `chronik-client` dep [D18976](https://reviews.bitcoinabc.org/D18976)

### 2.6.7

- Publish to catch updated `chronik-client` and `ecash-wallet` deps [D18995](https://reviews.bitcoinabc.org/D18995)

### 2.6.8

- Publish to catch updated `chronik-client` and `ecash-wallet` deps [D19052](https://reviews.bitcoinabc.org/D19052)

### 2.6.9

- Publish to catch updated `chronik-client` and `ecash-wallet` deps [D19140](https://reviews.bitcoinabc.org/D19140)

### 2.6.10

- Upgrade types for agora fuel utxo functions to support new `WalletUtxo` type in `ecash-wallet` [D19271](https://reviews.bitcoinabc.org/D19271)

### 2.6.11

- Publish to catch updated `ecash-wallet` dep [D19357](https://reviews.bitcoinabc.org/D19357)

### 2.6.12

- Publish to catch updated `ecash-wallet` dep [D19372](https://reviews.bitcoinabc.org/D19372)

### 2.6.13

- Publish to catch updated `ecash-wallet` dep [D19381](https://reviews.bitcoinabc.org/D19381)

### 2.6.14

- Publish to catch updated `ecash-wallet` 3.9.0 dep [D19406](https://reviews.bitcoinabc.org/D19406)

### 2.6.15

- Publish to catch updated `ecash-lib` and `ecash-wallet` after support for arbitrary prefixes [D19451](https://reviews.bitcoinabc.org/D19451)

### 2.6.16

- Publish to catch updead `ecash-wallet` breaking change `4.0.0` [D19476](https://reviews.bitcoinabc.org/D19476)

### 2.7.0 [D19491](https://reviews.bitcoinabc.org/D19491)

- Add a `list()` method to `AgoraOneShot` for building and broadcasting SLP NFT listings with an `ecash-wallet` `Wallet`
- Add a `list()` method to `AgoraPartial` for building and broadcasting SLP and ALP listings with an `ecash-wallet` `Wallet`
