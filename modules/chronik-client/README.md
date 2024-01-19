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

0.10.1 - Deprecate client-side ping keepAlive. Server-side is now available.
0.11.0 - Add support for `chronikInfo()` method to `ChronikClientNode`
