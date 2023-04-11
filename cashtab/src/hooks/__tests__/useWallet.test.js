import useWallet from '../useWallet';
import { renderHook, act } from '@testing-library/react-hooks';
import mockLegacyWallets from '../__mocks__/mockLegacyWallets';

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
