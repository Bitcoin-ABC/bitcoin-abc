/**
 * @jest-environment ./config/jest/uint8array-environment
 */

import useWallet from '../useWallet';
import { renderHook, act } from '@testing-library/react-hooks';
import mockLegacyWallets from '../__mocks__/mockLegacyWallets';
import BCHJS from '@psf/bch-js';
import useBCH from '../useBCH';

jest.mock('../useBCH');

test('Migrating legacy wallet on mainnet', async () => {
    useBCH.mockReturnValue({ getBCH: () => new BCHJS() });
    const { result } = renderHook(() => useWallet());

    process = {
        env: {
            REACT_APP_BCHA_APIS:
                'https://rest.kingbch.com/v3/,https://wallet-service-prod.bitframe.org/v3/,notevenaurl,https://rest.kingbch.com/v3/',
        },
    };

    result.current.getWallet = false;
    let wallet;
    await act(async () => {
        wallet = await result.current.migrateLegacyWallet(
            mockLegacyWallets.legacyAlphaMainnet,
        );
    });
    expect(wallet).toStrictEqual(mockLegacyWallets.migratedLegacyAlphaMainnet);
});
