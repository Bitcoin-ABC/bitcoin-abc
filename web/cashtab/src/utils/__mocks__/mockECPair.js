export const mockWif = 'L2mHRHSThu7JajH1V4vDDw56nWVCFckLVpJHzgp2dDknWfPJFr1w';

// Note that the ECPair `mockECPair` does not include BigInteger type information or undefined fields
export const mockECPair = {
    d: {
        0: 58579411,
        1: 33017197,
        2: 12049976,
        3: 61298434,
        4: 15265756,
        5: 29527710,
        6: 19761499,
        7: 46297331,
        8: 18590431,
        9: 2710394,
        10: 0,
        t: 10,
        s: 0,
    },
    compressed: true,
    network: {
        hashGenesisBlock:
            '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
        port: 8333,
        portRpc: 8332,
        protocol: { magic: 3652501241 },
        seedsDns: [
            'seed.bitcoinabc.org',
            'seed-abc.bitcoinforks.org',
            'btccash-seeder.bitcoinunlimited.info',
            'seed.bitprim.org',
            'seed.deadalnix.me',
            'seeder.criptolayer.net',
        ],
        versions: {
            bip32: { private: 76066276, public: 76067358 },
            bip44: 145,
            private: 128,
            public: 0,
            scripthash: 5,
            messagePrefix: '\u0018BitcoinCash Signed Message:\n',
        },
        name: 'BitcoinCash',
        per1: 100000000,
        unit: 'BCH',
        testnet: false,
        messagePrefix: '\u0018BitcoinCash Signed Message:\n',
        bip32: { public: 76067358, private: 76066276 },
        pubKeyHash: 0,
        scriptHash: 5,
        wif: 128,
        dustThreshold: null,
    },
};

export const mockStringifiedECPair = JSON.stringify(mockECPair);
