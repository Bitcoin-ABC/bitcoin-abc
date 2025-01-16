# mock-chronik-client

Testing utility to mock the Chronik indexer client and support unit tests that need to mock chronik related API calls.

## Usage

Mock chronik API calls including tx broadcasting and paginated tx history. Also includes an Agora mock. See unit tests for latest usage.

## Questions?

If you have any implementation questions regarding this mock tool please check the test suite in `/test/index.test.js` or feel free to reach out to the development team via the [eCash Development Telegram](https://t.me/eCashDevelopment).

### Change Log

1.1.0

-   Add support to in-node subscribeToBlocks method and check flag, isSubscribedBlocks

1.1.1

-   Patch error tests

1.2.0

-   Add support to calls by `address(address)` returning same as `script(type, hash)`

1.3.0

-   Add support for `subscribeToAddress` and `unsubscribeFromAddress` websocket methods

1.4.0

-   Add support for `ws.unsubscribe` method and fix errors in `ws` tests

1.4.1

-   Patch repo path in package.json

1.5.0

-   Add support for ws subscribe methods and shape found in in-node chronik-client

1.6.0

-   Match shape of `subs` object in `ChronikClientNode` for `ChronikClientNode` ws methods and support unsubscribe from blocks

1.7.0

-   Allow getting and setting utxos() and history() by tokenId

1.8.0

-   Allow getting history without specifying pageNumber or pageSize

1.9.0

-   Support `blockTxs` endpoint
-   Update websocket subs shape to match ChronikClientNode

1.9.1

-   Upgrading npm dependencies [D16380](https://reviews.bitcoinabc.org/D16380)

1.10.0

-   Allow getting and setting `history()` by `lokadId` [D16382](https://reviews.bitcoinabc.org/D16382)

1.10.1

-   Return missing `numTxs` key from `history()` calls [D16617](https://reviews.bitcoinabc.org/D16617)

1.11.0

-   Add support for `MockAgora`, a simple set-and-return mock for some `ecash-agora` class methods [D16737](https://reviews.bitcoinabc.org/D16737)

1.12.0

-   Extend `MockAgora` support to cover `offeredFungibleTokenIds()` and `activeOffersByTokenId()` methods [D16929](https://reviews.bitcoinabc.org/D16929)

1.12.1

-   Build published version with dependencies from `npm` [D17227](https://reviews.bitcoinabc.org/D17227)

1.12.2

-   Add `MockAgora` to stub ts declarations [D17274](https://reviews.bitcoinabc.org/D17274)

1.12.3

-   Add dummy `plugin` method to allow construction of `new Agora()` from `ecash-agora` with a `MockChronikClient` [D17279](https://reviews.bitcoinabc.org/D17279)

2.0.0

[D17332](https://reviews.bitcoinabc.org/D17332)

-   Full implementation of typescript
-   Set history and utxos by script, address, or tokenId in one step (prev 2)
-   Set history by lokadId in one step (prev 2)
-   Better type checking
-   Improved mock websocket (now it more closely follows the API of chronik-client)
-   Add `broadcastTxs` method
-   Add `chronikInfo` method

2.0.1

-   Build before deployment so it also works for non-ts users [D17338](https://reviews.bitcoinabc.org/D17338)

2.1.0

-   Support for Agora plugin websocket subscriptions [D17369](https://reviews.bitcoinabc.org/D17369)

2.1.1

-   Upgrade to dependency-free `ecashaddrjs` [D17269](https://reviews.bitcoinabc.org/D17269)

2.1.2

-   Update README [D17506](https://reviews.bitcoinabc.org/D17506)

2.1.3

-   Update `package.json` paths for correct typescript `dist` [D17542](https://reviews.bitcoinabc.org/D17542)
