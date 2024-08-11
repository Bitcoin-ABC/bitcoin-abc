# App dev reference guide

This folder contains a series of example code to serve as a reference guide for app developers looking to build on eCash.

These examples utilize the [Chronik](https://www.npmjs.com/package/chronik-client) indexer and [NodeJS](https://github.com/nvm-sh/nvm) to interact with the eCash blockchain and highlights some of the technical nuances specific to app development on eCash.

## Requirements

Please ensure your node version is > 16.x.x and the chronik and mocha dependencies are installed:

-   `nvm install 16`
-   `npm i`

## Chronik indexer

If you'd like to optionally setup your own Chronik instance, please refer to the [Chronik NNG README](https://github.com/raipay/chronik/).

## Simple Examples

<details>
		<summary>Retrieving transaction details from txid</summary>

[getDetailsFromTxid()](scripts/getDetailsFromTxid.js)

**_Usage_**: `npm run getDetailsFromTxid <txid>`

**_Example_**: `npm run getDetailsFromTxid bd6ed16b16c00808ee242e570a2672f596434c09da5290ff77cadf52387bd2f3`

</details>

<details>
		<summary>Retrieving transaction history from address</summary>

[getTxHistoryFromAddress()](scripts/getTxHistoryFromAddress.js)

**_Usage_**: `npm run getTxHistoryFromAddress <address> <page> <pageSize>`

**_Example_**: `npm run getTxHistoryFromAddress ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx 0 10`

</details>

<details>
		<summary>Retrieving UTXOs from address</summary>

[getUtxosFromAddress()](scripts/getUtxosFromAddress.js)

**_Usage_**: `npm run getUtxosFromAddress <address>`

**_Example_**: `npm run getUtxosFromAddress ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx`

</details>

<details>
		<summary>Creating a new wallet</summary>

[createWallet()](scripts/createWallet.js)

**_Usage_**: `npm run createWallet`

</details>

<details>
		<summary>Retrieving details of an SLP token</summary>

[getTokenDetails()](scripts/getTokenDetails.js)

**_Usage_**: `npm run getTokenDetails <token id>`

**_Example_**: `npm run getTokenDetails 861dede36f7f73f0af4e979fc3a3f77f37d53fe27be4444601150c21619635f4`

</details>

<details>
		<summary>Sending a one to one XEC transaction</summary>

[sendXec()](scripts/sendXec.js)

**_Usage_**:

1. Update the senderAddress and senderMnemonic constants in sendXec.js
2. `npm run sendXec <address> <XEC amount>`

**_Example_**: `npm run sendXec ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx 50`

</details>

<details>
		<summary>(WIP) Sending a one to one SLP token transaction</summary>
TBC
</details>

<details>
		<summary>(WIP) Creating an SLP token</summary>
TBC
</details>

<details>
		<summary>(WIP) Burning an SLP token</summary>
TBC
</details>

## Advanced Examples

<details>
		<summary>Using websockets to listen for confirmation of a transaction</summary>

[listenForConfirmation()](scripts/listenForConfirmation.js)

**_Usage_**: `npm run listenForConfirmation <address> <txid>`

**_Example_**: `npm run listenForConfirmation ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx 3bae2f96cf076437ba1755c8e12f864bf6c060071ed12173a5e505c2d4b9a3c9`

</details>

<details>
		<summary>(WIP) Using websockets to listen for new blocks found</summary>
TBC
</details>

<details>
		<summary>(WIP) Create a one to many XEC transaction </summary>
TBC
</details>

<details>
		<summary>(WIP) Create an OP_RETURN messaging transaction </summary>
TBC
</details>

<details>
		<summary>(WIP) Create an encrypted OP_RETURN messaging transaction </summary>
TBC
</details>

<details>
		<summary>(WIP)  Implementing CashtabPay from cashtab-components for an online store </summary>
TBC
</details>

## Questions?

If you have any questions regarding these examples please feel free to reach out to the development team via the [eCash Builders Telegram](https://t.me/eCashBuilders).
