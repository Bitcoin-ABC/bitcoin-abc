// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export default {
    legacyAlphaMainnet: {
        mnemonic:
            'apart vacuum color cream drama kind foil history hurt alone ask census',
        name: 'MigrationTestAlpha on Mainnet',
        Path245: {
            cashAddress:
                'bitcoincash:qztqe8k4v8ckn8cvfxt5659nhd7dcyvxy54hkry298',
            slpAddress:
                'simpleledger:qztqe8k4v8ckn8cvfxt5659nhd7dcyvxy5evac32me',
            fundingWif: 'KwgNkyijAaxFr5XQdnaYyNMXVSZobgHzSoKKfWiC3Q7Xr4n7iYMG',
            fundingAddress:
                'simpleledger:qztqe8k4v8ckn8cvfxt5659nhd7dcyvxy5evac32me',
            legacyAddress: '1EgPUfBgU7ekho3EjtGze87dRADnUE8ojP',
        },
        Path145: {
            cashAddress:
                'bitcoincash:qq47pcxfn8n7w7jy86njd7pvgsv39l9f9v0lgx569z',
            slpAddress:
                'simpleledger:qq47pcxfn8n7w7jy86njd7pvgsv39l9f9vryrap6mu',
            fundingWif: 'L2xvTe6CdNxroR6pbdpGWNjAa55AZX5Wm59W5TXMuH31ihNJdDjt',
            fundingAddress:
                'simpleledger:qq47pcxfn8n7w7jy86njd7pvgsv39l9f9vryrap6mu',
            legacyAddress: '1511T3ynXKgCwXhFijCUWKuTfqbPxFV1AF',
        },
    },

    migratedLegacyAlphaMainnet: {
        mnemonic:
            'apart vacuum color cream drama kind foil history hurt alone ask census',
        name: 'MigrationTestAlpha on Mainnet',
        Path245: {
            cashAddress: 'ecash:qztqe8k4v8ckn8cvfxt5659nhd7dcyvxy5v6zglsrs',
            fundingWif: 'KwgNkyijAaxFr5XQdnaYyNMXVSZobgHzSoKKfWiC3Q7Xr4n7iYMG',
            hash160: '960c9ed561f1699f0c49974d50b3bb7cdc118625',
            publicKey:
                '03c4a69fd90c8b196683216cffd2943a7b13b0db0812e44a4ff156ac7e03fc4ed7',
        },
        Path145: {
            cashAddress: 'ecash:qq47pcxfn8n7w7jy86njd7pvgsv39l9f9vkjud0qr4',
            fundingWif: 'L2xvTe6CdNxroR6pbdpGWNjAa55AZX5Wm59W5TXMuH31ihNJdDjt',
            hash160: '2be0e0c999e7e77a443ea726f82c441912fca92b',
            publicKey:
                '02fe5308d77bcce825068a9e46adc6f032dbbe39167a7b6d05ac563ac71d8b186e',
        },
        Path1899: {
            cashAddress: 'ecash:qzagy47mvh6qxkvcn3acjnz73rkhkc6y7ccxkrr6zd',
            fundingWif: 'Kx4FiBMvKK1iXjFk5QTaAK6E4mDGPjmwDZ2HDKGUZpE4gCXMaPe9',
            hash160: 'ba8257db65f40359989c7b894c5e88ed7b6344f6',
            publicKey:
                '02a06bb380cf180d703f6f80796a13555aefff817d1f6f842f1e5c555b15f0fa70',
        },
    },
};
