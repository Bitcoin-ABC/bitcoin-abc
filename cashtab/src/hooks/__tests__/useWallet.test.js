import useWallet from '../useWallet';
import { renderHook, act } from '@testing-library/react-hooks';
import mockLegacyWallets from '../__mocks__/mockLegacyWallets';
import { cashtabSettings as cashtabDefaultConfig } from 'config/cashtabSettings';
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

test('Verify processChronikWsMsg() processes AddedToMempool events', async () => {
    const { result } = renderHook(() => useWallet());
    const mockWebsocketMsg = { type: 'AddedToMempool' };

    await result.current.processChronikWsMsg(mockWebsocketMsg);

    const walletState = result.current.wallet;
    const fiatPriceState = result.current.fiatPrice;

    // verify upon `AddedToMempool` events processChronikWsMsg() processes the wallet and fiatPrice input args
    assert.notEqual(walletState, false);
    assert.notEqual(fiatPriceState, null);
});

test('Verify processChronikWsMsg() does not process BlockConnected events', async () => {
    const { result } = renderHook(() => useWallet());
    const mockWebsocketMsg = { type: 'BlockConnected' };

    await result.current.processChronikWsMsg(mockWebsocketMsg);

    const walletState = result.current.wallet;
    const fiatPriceState = result.current.fiatPrice;

    // verify upon `BlockConnected` events processChronikWsMsg() returns early and does not process the wallet and fiatPrice input args
    assert.strictEqual(walletState, false);
    assert.strictEqual(fiatPriceState, null);
});
