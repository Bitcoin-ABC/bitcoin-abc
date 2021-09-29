import useWallet from '../useWallet';
import useBCH from '../useBCH';
import { renderHook } from '@testing-library/react-hooks';
import mockLegacyWallets from '../__mocks__/mockLegacyWallets';
import BCHJS from '@psf/bch-js';

jest.mock('../useBCH');
useBCH.mockReturnValue({ getBCH: () => new BCHJS() });

test('Migrating legacy wallet on testnet', async () => {
    const expectedMigrationResult = {
        Path145: {
            cashAddress:
                'bitcoincash:qq47pcxfn8n7w7jy86njd7pvgsv39l9f9v0lgx569z',
            fundingAddress:
                'simpleledger:qq47pcxfn8n7w7jy86njd7pvgsv39l9f9vryrap6mu',
            fundingWif: 'L2xvTe6CdNxroR6pbdpGWNjAa55AZX5Wm59W5TXMuH31ihNJdDjt',
            legacyAddress: '1511T3ynXKgCwXhFijCUWKuTfqbPxFV1AF',
            slpAddress:
                'simpleledger:qq47pcxfn8n7w7jy86njd7pvgsv39l9f9vryrap6mu',
        },
        Path1899: {
            cashAddress: 'bchtest:qzagy47mvh6qxkvcn3acjnz73rkhkc6y7c9ex06hrx',
            fundingAddress:
                'slptest:qzagy47mvh6qxkvcn3acjnz73rkhkc6y7c7dp5qq3m',
            fundingWif: 'cNRFB6MmkNhyhAj1TpGhXdbHgzWg4BsdHbAkKjiz4vt4vwgpC44F',
            legacyAddress: 'mxX888y8yaPpTYh3WhrB9GEkT3cgumYwPw',
            slpAddress: 'slptest:qzagy47mvh6qxkvcn3acjnz73rkhkc6y7c7dp5qq3m',
        },
        Path245: {
            cashAddress:
                'bitcoincash:qztqe8k4v8ckn8cvfxt5659nhd7dcyvxy54hkry298',
            fundingAddress:
                'simpleledger:qztqe8k4v8ckn8cvfxt5659nhd7dcyvxy5evac32me',
            fundingWif: 'KwgNkyijAaxFr5XQdnaYyNMXVSZobgHzSoKKfWiC3Q7Xr4n7iYMG',
            legacyAddress: '1EgPUfBgU7ekho3EjtGze87dRADnUE8ojP',
            slpAddress:
                'simpleledger:qztqe8k4v8ckn8cvfxt5659nhd7dcyvxy5evac32me',
        },
        mnemonic:
            'apart vacuum color cream drama kind foil history hurt alone ask census',
        name: 'MigrationTestAlpha',
    };
    const { result } = renderHook(() => useWallet());
    process = {
        env: {
            REACT_APP_NETWORK: `testnet`,
            REACT_APP_BCHA_APIS:
                'https://rest.kingbch.com/v3/,https://wallet-service-prod.bitframe.org/v3/,notevenaurl,https://rest.kingbch.com/v3/',
            REACT_APP_BCHA_APIS_TEST: 'https://free-test.fullstack.cash/v3/',
        },
    };

    const BCH = new BCHJS();
    result.current.getWallet = false;
    let wallet;
    wallet = await result.current.migrateLegacyWallet(
        BCH,
        mockLegacyWallets.legacyAlpha,
    );
    expect(wallet).toStrictEqual(expectedMigrationResult);
});

test('Migrating legacy wallet on mainnet', async () => {
    const expectedMigrationResult = {
        Path145: {
            cashAddress:
                'bitcoincash:qq47pcxfn8n7w7jy86njd7pvgsv39l9f9v0lgx569z',
            fundingAddress:
                'simpleledger:qq47pcxfn8n7w7jy86njd7pvgsv39l9f9vryrap6mu',
            fundingWif: 'L2xvTe6CdNxroR6pbdpGWNjAa55AZX5Wm59W5TXMuH31ihNJdDjt',
            legacyAddress: '1511T3ynXKgCwXhFijCUWKuTfqbPxFV1AF',
            slpAddress:
                'simpleledger:qq47pcxfn8n7w7jy86njd7pvgsv39l9f9vryrap6mu',
        },
        Path1899: {
            cashAddress:
                'bitcoincash:qzagy47mvh6qxkvcn3acjnz73rkhkc6y7cptzgcqy6',
            fundingAddress:
                'simpleledger:qzagy47mvh6qxkvcn3acjnz73rkhkc6y7cdsfndq6y',
            fundingWif: 'Kx4FiBMvKK1iXjFk5QTaAK6E4mDGPjmwDZ2HDKGUZpE4gCXMaPe9',
            legacyAddress: '1J1Aq5tAAYxZgSDRo8soKM2Rb41z3xrYpm',
            slpAddress:
                'simpleledger:qzagy47mvh6qxkvcn3acjnz73rkhkc6y7cdsfndq6y',
        },
        Path245: {
            cashAddress:
                'bitcoincash:qztqe8k4v8ckn8cvfxt5659nhd7dcyvxy54hkry298',
            fundingAddress:
                'simpleledger:qztqe8k4v8ckn8cvfxt5659nhd7dcyvxy5evac32me',
            fundingWif: 'KwgNkyijAaxFr5XQdnaYyNMXVSZobgHzSoKKfWiC3Q7Xr4n7iYMG',
            legacyAddress: '1EgPUfBgU7ekho3EjtGze87dRADnUE8ojP',
            slpAddress:
                'simpleledger:qztqe8k4v8ckn8cvfxt5659nhd7dcyvxy5evac32me',
        },
        mnemonic:
            'apart vacuum color cream drama kind foil history hurt alone ask census',
        name: 'MigrationTestAlpha',
    };
    const { result } = renderHook(() => useWallet());
    process = {
        env: {
            REACT_APP_NETWORK: `mainnet`,
            REACT_APP_BCHA_APIS:
                'https://rest.kingbch.com/v3/,https://wallet-service-prod.bitframe.org/v3/,notevenaurl,https://rest.kingbch.com/v3/',
            REACT_APP_BCHA_APIS_TEST: 'https://free-test.fullstack.cash/v3/',
        },
    };

    const BCH = new BCHJS();
    result.current.getWallet = false;
    let wallet;
    wallet = await result.current.migrateLegacyWallet(
        BCH,
        mockLegacyWallets.legacyAlpha,
    );
    expect(wallet).toStrictEqual(expectedMigrationResult);
});
