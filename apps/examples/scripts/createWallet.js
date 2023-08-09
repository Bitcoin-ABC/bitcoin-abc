// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const bip39 = require('bip39');
const randomBytes = require('randombytes');
const utxolib = require('@bitgo/utxo-lib');
const ecashaddr = require('ecashaddrjs');

/**
 * Returns the attributes of a newly created wallet
 * @returns {object} wallet object consisting of address, public key, mnemonic and derivation path
 * @usage:
 *    const wallet = await createWallet();
 */
async function createWallet() {
    // note: english is typically the recommended default but it is possible to use other languages.
    // see https://github.com/bitcoinjs/bip39#readme for further details
    const lang = 'english';

    // create 128 bit BIP39 mnemonic
    // note: the terms 'seed' and 'mnemonic' are often used interchangeably and both refers to a 12 word human-readable private key backup
    const mnemonic = bip39.generateMnemonic(
        128,
        randomBytes,
        bip39.wordlists[lang],
    );

    // extract the master node
    // see https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki to understand HD wallets and derivation paths
    const rootSeedBuffer = await bip39.mnemonicToSeed(mnemonic, '');
    const masterHDNode = utxolib.bip32.fromSeed(
        rootSeedBuffer,
        utxolib.networks.ecash,
    );

    // For eCash wallets, Path 1899 is used for a wallet that supports eTokens
    // A wallet "supports eTokens" by recognizing valid eToken utxos and using them only
    // in valid eToken txs. This support must be implemented by the wallet dev and is not automatically
    // enabled by choosing Path1899
    // Path 899 is used for a wallet that does not support eTokens
    // Different wallets in the eCash ecosystem may opt for different paths so this needs to be considered as part of interoperability plans
    const derivationPath = "m/44'/1899'/0'/0/0";

    // derive wallet attributes
    const node = masterHDNode.derivePath(derivationPath);
    const publicKey = node.publicKey.toString('hex');
    const privateKey = node.toWIF();
    const publicKeyHash = node.identifier.toString('hex');

    // 'p2pkh' is a type of ScriptPubKey which locks bitcoin to the hash of a public key.
    // 'p2pkh' is the standard for most wallets whereas 'p2sh' is a multisig or other advanced features such as smart contracts
    const eCashAddress = ecashaddr.encode('ecash', 'p2pkh', node.identifier);

    return {
        address: eCashAddress,
        publicKey: publicKey,
        publicKeyHash: publicKeyHash,
        privateKey: privateKey,
        mnemonic: mnemonic,
        derivationPath: derivationPath,
    };
}

// Executed via 'npm run createWallet'
(async () => {
    const wallet = await createWallet();
    console.log(wallet);
})();

module.exports.createWallet = createWallet;
