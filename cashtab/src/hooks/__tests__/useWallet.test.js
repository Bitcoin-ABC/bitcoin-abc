import useWallet from '../useWallet';
import { renderHook, act } from '@testing-library/react-hooks';
import mockLegacyWallets from '../__mocks__/mockLegacyWallets';
import { cashtabSettings as cashtabDefaultConfig } from 'config/cashtabSettings';
import { isValidStoredWallet } from 'utils/cashMethods';
import aliasSettings from 'config/alias';
import { when } from 'jest-when';
const assert = require('assert');

test('Migrating legacy wallet on mainnet', async () => {
    const { result } = renderHook(() => useWallet());
    result.current.getWallet = false;

    let wallet;
    await act(async () => {
        wallet = await result.current.migrateLegacyWallet(
            mockLegacyWallets.legacyAlphaMainnet,
        );
    });
    expect(wallet).toStrictEqual(mockLegacyWallets.migratedLegacyAlphaMainnet);
});

test('Verify default Cashtab settings are initialized', async () => {
    const { result } = renderHook(() => useWallet());

    let cashtabSettings;
    await act(async () => {
        cashtabSettings = await result.current.loadCashtabSettings();
    });

    assert.deepEqual(cashtabSettings, cashtabDefaultConfig);
});

test('Verify handleUpdateWallet() correctly initializes the active wallet', async () => {
    const { result } = renderHook(() => useWallet());
    function setWallet() {} // mock the setWallet state variable in useWallet
    await result.current.handleUpdateWallet(setWallet); // triggers loadWalletFromStorageOnStartup(setWallet)

    // active wallet at this point only contains name, mnemonic, Path245, Path145 and Path1899 keys
    const activeWallet = await result.current.wallet;

    // at the point of handleUpdateWallet() being called, the wallet has not been initialized with balances, utxos and token details
    const uninitializedWalletKeys = {
        state: {
            balances: {},
            slpUtxos: {},
            nonSlpUtxos: {},
            tokens: {},
        },
    };

    // append the uninitialized wallet keys due to this point in useWallet's state
    const fullWallet = {
        ...activeWallet,
        ...uninitializedWalletKeys,
    };

    assert.strictEqual(isValidStoredWallet(fullWallet), true);
});

test('Verify processChronikWsMsg() processes AddedToMempool events', async () => {
    const { result } = renderHook(() => useWallet());
    const mockWebsocketMsg = { type: 'AddedToMempool' };

    await result.current.processChronikWsMsg(mockWebsocketMsg);

    const walletState = result.current.wallet;

    // verify upon `AddedToMempool` events processChronikWsMsg() processes the wallet input arg
    assert.notEqual(walletState, false);
});

test('Verify processChronikWsMsg() does not process BlockConnected events', async () => {
    const { result } = renderHook(() => useWallet());
    const mockWebsocketMsg = { type: 'BlockConnected' };

    await result.current.processChronikWsMsg(mockWebsocketMsg);

    const walletState = result.current.wallet;

    // verify upon `BlockConnected` events processChronikWsMsg() returns early and does not process the wallet input arg
    assert.strictEqual(walletState, false);
});

test('Verify refreshAliases() updates the `aliases` state variable on a successful /address/ endpoint response', async () => {
    const { result } = renderHook(() => useWallet());
    const address = 'ecash:qzth8qvakhr6y8zcefdrvx30zrdmt2z2gvp7zc5vj8';
    const endPoint = 'address';
    const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/${endPoint}/${address}`;
    const mockAliasServerResponse = {
        registered: [
            {
                alias: 'john',
                address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                txid: 'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d',
                blockheight: 792417,
            },
            {
                alias: 'jane',
                address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                txid: '0c77e4f7e0ff4f1028372042cbeb97eaddb64d505efe960b5a1ca4fce65598e2',
                blockheight: 792418,
            },
        ],
        pending: [],
    };

    // Mock the fetch call to alias-server's '/address' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({
            json: () => Promise.resolve(mockAliasServerResponse),
        });

    // Execute the refreshAliases function with the mocked alias-server call
    await result.current.refreshAliases(address);

    // Verify the `aliases` state var in useWallet is updated
    assert.deepEqual(result.current.aliases, mockAliasServerResponse);
});

test('Verify refreshAliases() updates the `aliasServerError` state variable upon an /address/ endpoint error', async () => {
    const { result } = renderHook(() => useWallet());
    const address = 'ecash:qzth8qvakhr6y8zcefdrvx30zrdmt2z2gvp7zc5vj8';
    const endPoint = 'address';
    const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/${endPoint}/${address}`;
    const expectedError = {
        error: 'Error: Unable to retrieve aliases',
    };

    // Mock the fetch call to alias-server's '/address' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({
            json: () => Promise.resolve(expectedError),
        });

    // Execute the refreshAliases function with the mocked alias-server call
    await result.current.refreshAliases(address);

    // Verify the `aliasServerError` state var in useWallet is updated
    assert.deepEqual(result.current.aliasServerError, expectedError.error);
});
