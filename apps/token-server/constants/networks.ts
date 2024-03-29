// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * networks.ts
 * Constants useful in adapting bitcoinjs-lib to eCash transactions
 */

// From bitcoinjs-lib, for reference
const BITCOIN_NETWORK = {
    bitcoin: {
        messagePrefix: '\x18Bitcoin Signed Message:\n',
        bech32: 'bc',
        bip32: { public: 76067358, private: 76066276 },
        pubKeyHash: 0,
        scriptHash: 5,
        wif: 128,
    },
};

// From BitGoJS utxo-lib, for reference
const ECASH_NETWORK = {
    messagePrefix: '\x16eCash Signed Message:\n',
    bip32: {
        // base58 'xpub'
        public: 0x0488b21e,
        // base58 'xprv'
        private: 0x0488ade4,
    },
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80,
    forkId: 0x00,
    cashAddr: {
        prefix: 'ecash',
        pubKeyHash: 0x00,
        scriptHash: 0x08,
    },
};
