# mock-chronik-client

Testing utility to mock the Chronik indexer client and support unit tests that need to mock chronik related API calls.

## Usage

Import the MockChronikClient module via relative path along with any desired mock objects from `/mocks/mockChronikResponses`.

```
const { MockChronikClient } = require('/index');
// Import any mock responses from '/mocks/mockChronikResponses'
const ecashaddr = require('ecashaddrjs');
const mockedChronik = new MockChronikClient();
```

**_Mocking API Responses_**

Chronik-client APIs which **don't** rely on a preceding `.script()` call can use the `.setMock()` function to inject the mock API response.

This includes:

-   `.block()`
-   `.tx()`
-   `.token()`
-   `.blockchainInfo()`
-   `.broadcastTx()`
-   `.ws()`

Example: mocking the chronik.token() call

```
const { mockTokenInfo } = require('/mocks/mockChronikResponses');
// Initialize chronik mock with token info
mockedChronik.setMock('token', {
	input: 'some token ID',
	output: mockTokenInfo,
});

// Execute the API call
const result = await mockedChronik.token('some token ID');
assert.deepEqual(result, mockTokenInfo);
```

Chronik-client APIs which **do** rely on a preceding `.script()` call will need to firstly set the intended script (address type and hash) before setting the specific mock function.

This includes:

-   `.script().utxos()`
-   `.script().history()`

Example: mocking the chronik.script(type, hash).utxos() call

```
const { mockP2pkhUtxos } = require('/mocks/mockChronikResponses');
// Initialize chronik mock with script and utxo info
const P2PKH_ADDRESS = 'ecash:qzth8qvakhr6y8zcefdrvx30zrdmt2z2gvp7zc5vj8';
const { type, hash } = ecashaddr.decode(P2PKH_ADDRESS, true);
mockedChronik.setScript(type, hash);
mockedChronik.setUtxos(type, hash, mockP2pkhUtxos);

// Execute the API call
const result = await mockedChronik.script(type, hash).utxos();
assert.deepEqual(result, mockP2pkhUtxos);
```

**_Mocking API Errors_**

To test your app's behavior in handling an API error from Chronik, simply set an Error object as the mock output.

Example: mocking an error from the chronik.broadcastTx() call

```
const mockInvalidRawTxHex = 'not a valid raw tx hex';
const expectedError = new Error('Bad response from Chronik');
mockedChronik.setMock('broadcastTx', {
	input: mockInvalidRawTxHex,
	output: expectedError,
});

// Execute the API call
await assert.rejects(
	async () => {
		await mockedChronik.broadcastTx(mockInvalidRawTxHex);
	},
	expectedError,
);
```

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
