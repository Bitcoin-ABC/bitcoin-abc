# Chronik Indexer Client

Access Chronik Indexer via browser or Node.

## Installation

`npm install chronik-client`

`yarn add chronik-client`

## Usage

```js
import { ChronikClient } from 'chronik-client';
// For XEC, eCash chain:
const chronik = new ChronikClient('https://chronik.be.cash/xec');
// For XPI, Lotus chain:
const chronik = new ChronikClient('https://chronik.be.cash/xpi');

As of version 0.9.0, the ChronikClient constructor can also optionally
accept an array of chronik urls. e.g.
const chronik = new ChronikClient([
    'https://chronik.be.cash/xec',
    'https://chronik.fabien.cash',
]);
If the first url is non-responsive it will cycle through the rest of the array.

// Get Genesis block (on eCash):
const block = await chronik.block(
    '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
);

// Get the first 11 blocks of the chain:
const blocks = await chronik.blocks(0, 10);

// Get SLP tx details on eCash:
const tx = await chronik.tx(
    '0f3c3908a2ddec8dea91d2fe1f77295bbbb158af869bff345d44ae800f0a5498',
);

// Get token details for a given token ID
const tokenDetails = await chronik.token(
    '0daf200e3418f2df1158efef36fbb507f12928f1fdcf3543703e64e75a4a9073',
);

// Validate Genesis UTXO (considered 'unspent' by Chronik):
const validationResult = await chronik.validateUtxos([
    {
        txid: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
        outIdx: 0,
    },
]);

const GENESIS_PK =
    '04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc' +
    '3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f';
// Get first page of tx history of the Genesis pubkey, most recent first:
const history = await chronik
    .script('p2pk', GENESIS_PK)
    .history(/*page=*/ 0, /*page_size=*/ 10);
// Get all UTXOs of the Genesis pubkey:
const utxos = await chronik.script('p2pk', GENESIS_PK).utxos();

// Listen to updates on scripts:
const ws = chronik.ws({
    onMessage: msg => {
        console.log('Got update: ', msg);
    },
    onReconnect: e => {
        // Fired before a reconnect attempt is made:
        console.log('Reconnecting websocket, disconnection cause: ', e);
    },
    // Optional: ping the ws every 30s to reduce disconnects
    keepAlive: true,
});
// Wait for WS to be connected:
await ws.waitForOpen();
// Subscribe to scripts (on Lotus, current ABC payout address):
// Will give a message on avg every 2 minutes
ws.subscribe('p2pkh', 'b8ae1c47effb58f72f7bca819fe7fc252f9e852e');
// Unsubscribe:
ws.unsubscribe('p2pkh', 'b8ae1c47effb58f72f7bca819fe7fc252f9e852e');
```

## Changelog

-   0.10.1 - Deprecate client-side ping keepAlive. Server-side is now available.
-   0.11.0 - Add support for `chronikInfo()` method to `ChronikClientNode`
-   0.11.1 - Do not try next server if error is unrelated to server failure
-   0.12.0 - Add support for `block(hashOrHeight)` and `blocks(startHeight, endHeight)` methods to `ChronikClientNode`
-   0.13.0 - Add support for `blockTxs(hashOrHeight, page, pageSize)` and `tx(txid)` methods to `ChronikClientNode`
-   0.14.0 - Add support for `rawTx(txid)` method to `ChronikClientNode`
-   0.15.0 - Add support for `script` endpoints `history()` and `utxos()` to `ChronikClientNode`
-   0.16.0 - Add support for `broadcastTx` and `broadcastTxs` endpoints to `ChronikClientNode`
-   0.17.0 - Add support for token proto to endpoints that return `Tx_InNode` to `ChronikClientNode`
-   0.18.0 - Add support for websocket connections to `ChronikClientNode`
-   0.19.0 - Add support for token data in tx inputs and outputs to `ChronikClientNode`
-   0.20.0 - Add support for calling script endpoints by address to `ChronikClientNode`
-   0.21.0 - Skipped as accidentally published 0.22.0 before diff approval at 0.21.1-rc.1
-   0.22.0 - Add support for `tokenId` endpoints and token data in utxos to `ChronikClientNode`
-   0.22.1 - Return `script` key for utxos fetched from `tokenId` endpoint
-   0.23.0 - Add support for returning `TokenInfo` from `chronik.token(tokenId)` calls to `ChronikClientNode`
-   0.24.0 - Support `subscribeToAddress` and `unsubscribeFromAddress` methods in the `ChronikClientNode` websocket
-   0.25.0 - Organize websocket subscriptions for `ChronikClientNode` under object instead of array
-   0.25.1 - Move `ecashaddrjs` from dev dependency to dependency
-   0.25.2 - Fix this package to work in the browser without requiring `Buffer` shim
-   0.26.0 - Add `confirmedTxs` and `unconfirmedTxs` to `script` endpoint
-   0.26.1 - If websocket takes longer than 5s to connect, try the next ws
-   0.26.2 - Return type `number` for `timeFirstSeen` from `chronik.token()` endpoint in `ChronikClientNode`
-   0.27.0 - Support for `lokadId` endpoints and websocket subscriptions
-   0.28.0 - Support for websocket subscriptions by `tokenID`
-   0.28.1 - Upgrading dependencies [D16375](https://reviews.bitcoinabc.org/D16375)
