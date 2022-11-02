/*
  info from:
    https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/src/chainparams.cpp

  Reference object: https://github.com/cryptocoinjs/coininfo/blob/master/lib/coins/bch.js
  
  Note: the bch object in the @psf/coininfo library (i.e. in this object) is slightly different to the canonical library referenced in the @psf/coininfo npm site
*/

let common = {
    name: 'BitcoinCash',
    per1: 1e8,
    unit: 'BCH',
};

let main = Object.assign(
    {},
    {
        hashGenesisBlock:
            '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
        // nDefaultPort
        port: 8333,
        portRpc: 8332,
        protocol: {
            // pchMessageStart
            magic: 0xd9b4bef9, // careful, sent over wire as little endian
        },
        // vSeeds
        seedsDns: [
            'seed.bitcoinabc.org',
            'seed-abc.bitcoinforks.org',
            'btccash-seeder.bitcoinunlimited.info',
            'seed.bitprim.org',
            'seed.deadalnix.me',
            'seeder.criptolayer.net',
        ],
        // base58Prefixes
        versions: {
            bip32: {
                private: 0x0488ade4,
                public: 0x0488b21e,
            },
            bip44: 145,
            private: 0x80,
            public: 0x00,
            scripthash: 0x05,
            messagePrefix: '\x18BitcoinCash Signed Message:\n',
        },
    },
    common,
);

// test obj kept otherwise output comparison tests will be false
let test = Object.assign(
    {},
    {
        hashGenesisBlock:
            '000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943',
        port: 18333,
        portRpc: 18332,
        protocol: {
            magic: 0x0709110b,
        },
        seedsDns: [
            'testnet-seed.bitcoinabc.org',
            'testnet-seed-abc.bitcoinforks.org',
            'testnet-seed.bitprim.org',
            'testnet-seed.deadalnix.me',
            'testnet-seeder.criptolayer.net',
        ],
        versions: {
            bip32: {
                private: 0x04358394,
                public: 0x043587cf,
            },
            bip44: 1,
            private: 0xef,
            public: 0x6f,
            scripthash: 0xc4,
            messagePrefix: '\x18BitcoinCash Signed Message:\n',
        },
    },
    common,
);

// regtest obj kept otherwise output comparison tests will be false
let regtest = Object.assign(
    {},
    {
        hashGenesisBlock:
            '0x0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206',
        port: 18444,
        portRpc: 18332,
        protocol: {
            magic: 0xdab5bffa,
        },
        seedsDns: [],
        versions: {
            bip32: {
                private: 0x04358394,
                public: 0x043587cf,
            },
            bip44: 1,
            private: 0xef,
            public: 0x6f,
            scripthash: 0xc4,
            messagePrefix: '\x18BitcoinCash Signed Message:\n',
        },
    },
    common,
);

module.exports = {
    main,
    test,
    regtest,
};
