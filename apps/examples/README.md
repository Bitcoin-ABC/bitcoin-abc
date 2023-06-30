# App dev reference guide

This folder contains a series of example code to serve as a reference guide for app developers looking to build on eCash.

These examples utilize the [Chronik](https://www.npmjs.com/package/chronik-client) indexer and [NodeJS](https://github.com/nvm-sh/nvm) to interact with the eCash blockchain and highlights some of the technical nuances specific to app development on eCash.

## Requirements

Please ensure your node version is > 16.x.x and the chronik and mocha dependencies are installed:

-   `nvm install 16`
-   `npm i`

## Chronik indexer

If you'd like to optionally setup your own Chronik instance, please refer to the [Chronik NNG README](https://github.com/raipay/chronik/).

## Examples

[x] [Retrieving transaction details - getDetailsFromTxid()](scripts/getDetailsFromTxid.js)
Usage: `npm run getDetailsFromTxid <chronik url> <txid>`
Example: `npm run getDetailsFromTxid https://chronik.fabien.cash fd9a775...fce0e`

[x] [Retrieving transaction history - getTxHistoryFromAddress()](scripts/getTxHistoryFromAddress.js)

Usage: `npm run getTxHistoryFromAddress <chronik url> <address> <page> <pageSize>`

Example: `npm run getTxHistoryFromAddress https://chronik.fabien.cash ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx 0 10`

[] Retrieving UTXOs for an address
[] Creating a new wallet
[] Collating inputs and outputs for sending XEC
[] Collating inputs and outputs for sending eTokens
[] Building and broadcasting transactions
[] Querying eToken genesis details and current stats
[] Querying holders of a particular eToken
[] Querying blockchain info
[] Using websockets to listen for confirmation of a transaction
[] Implementing CashtabPay from cashtab-components for an online store

## Questions?

If you have any questions regarding these examples please feel free to reach out to the development team via the [eCash Development Telegram](https://t.me/eCashDevelopment).
