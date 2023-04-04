// JavaScript component for eCash specific information such as version numbers, DNS seeds, etc
// implementation reference: https://github.com/cryptocoinjs/coininfo/blob/master/lib/coininfo.js

let Buffer = require('safe-buffer').Buffer;

// required for browserify
let coins = [require('./ecashCoinInfo')];

let supportedCoins = {};
const ecash = coins[0];

let unit = ecash.main.unit.toLowerCase();
let name = ecash.main.name.toLowerCase();
ecash.main.testnet = false;
ecash.main.toBitcoinJS = toBitcoinJS.bind(ecash.main);
ecash.main.toBitcore = toBitcore.bind(ecash.main);
supportedCoins[unit] = ecash.main;
supportedCoins[name] = ecash.main;

function coininfo(input) {
    let coin = input.toLowerCase();

    if (!(coin in supportedCoins)) {
        return null;
    } else {
        return supportedCoins[coin];
    }
}

coins.forEach(function (coin) {
    coininfo[coin.main.name.toLowerCase()] = coin;
});

// for use with bitcoinjs-lib
function toBitcoinJS() {
    return Object.assign({}, this, {
        messagePrefix:
            this.messagePrefix || '\x18' + this.name + ' Signed Message:\n',
        bech32: this.bech32,
        bip32: {
            public: (this.versions.bip32 || {}).public,
            private: (this.versions.bip32 || {}).private,
        },
        pubKeyHash: this.versions.public,
        scriptHash: this.versions.scripthash,
        wif: this.versions.private,
        dustThreshold: null, // TODO
    });
}

// for use with Bitcore
function toBitcore() {
    // reverse magic
    let nm = Buffer.allocUnsafe(4);
    nm.writeUInt32BE(this.protocol ? this.protocol.magic : 0, 0);
    nm = nm.readUInt32LE(0);

    return Object.assign({}, this, {
        name: this.testnet ? 'testnet' : 'livenet',
        alias: this.testnet ? 'testnet' : 'mainnet',
        pubkeyhash: this.versions.public,
        privatekey: this.versions.private,
        scripthash: this.versions.scripthash,
        xpubkey: (this.versions.bip32 || {}).public,
        xprivkey: (this.versions.bip32 || {}).private,
        networkMagic: nm,
        port: this.port,
        dnsSeeds: this.seedsDns || [],
    });
}

module.exports = coininfo;
