// Transaction builder module streamlined for eCash
// reference: https://github.com/Permissionless-Software-Foundation/bch-js/blob/master/src/transaction-builder.js
const eCash = require('ecashjs-lib');
import coininfo from 'utils/coininfo';
const bip66 = require('bip66');
const bip68 = require('bc-bip68');
import cashaddr from 'ecashaddrjs';

class TransactionBuilder {
    static setAddress(address) {
        TransactionBuilder._address = address;
    }

    constructor() {
        const bitcoincashBitcoinJSLib = coininfo.bitcoincash.main.toBitcoinJS();
        this.transaction = new eCash.TransactionBuilder(
            bitcoincashBitcoinJSLib,
        );
        this.DEFAULT_SEQUENCE = 0xffffffff;
        this.hashTypes = {
            SIGHASH_ALL: 0x01,
            SIGHASH_NONE: 0x02,
            SIGHASH_SINGLE: 0x03,
            SIGHASH_ANYONECANPAY: 0x80,
            SIGHASH_BITCOINCASH_BIP143: 0x40,
            ADVANCED_TRANSACTION_MARKER: 0x00,
            ADVANCED_TRANSACTION_FLAG: 0x01,
        };
        this.signatureAlgorithms = {
            ECDSA: eCash.ECSignature.ECDSA,
            SCHNORR: eCash.ECSignature.SCHNORR,
        };
        this.bip66 = bip66;
        this.bip68 = bip68;
        this.p2shInput = false;
    }

    addInput(txHash, vout, sequence = this.DEFAULT_SEQUENCE, prevOutScript) {
        this.transaction.addInput(txHash, vout, sequence, prevOutScript);
    }

    addInputScript(vout, script) {
        this.tx = this.transaction.buildIncomplete();
        this.tx.setInputScript(vout, script);
        this.p2shInput = true;
    }

    addInputScripts(scripts) {
        this.tx = this.transaction.buildIncomplete();
        scripts.forEach(script => {
            this.tx.setInputScript(script.vout, script.script);
        });
        this.p2shInput = true;
    }

    // Customized addOutput() including streamlined toLegacyAddress() logic from bch-js
    addOutput(scriptPubKey, amount) {
        try {
            const decoded = cashaddr.decode(scriptPubKey);

            // toLegacyAddress logic from bch-js
            // reference: https://github.com/Permissionless-Software-Foundation/bch-js/blob/906d9b209404bf404ca4f12fdde2f32751e9635c/src/address.js#L57
            let version;
            switch (decoded.type) {
                case 'P2PKH':
                    version = coininfo.bitcoincash.main.versions.public;
                    break;
                case 'P2SH':
                    version = coininfo.bitcoincash.main.versions.scripthash;
                    break;
                default:
                    throw new Error(
                        `Unsupported address type : ${decoded.type}`,
                    );
            }
            const legacyAddress = eCash.address.toBase58Check(
                Buffer.from(decoded.hash),
                version,
            );

            this.transaction.addOutput(legacyAddress, amount);
        } catch (error) {
            // if output[0] was an OP_RETURN hex, add directly
            this.transaction.addOutput(scriptPubKey, amount);
        }
    }

    setLockTime(locktime) {
        this.transaction.setLockTime(locktime);
    }

    sign(
        vin,
        keyPair,
        redeemScript,
        hashType = this.hashTypes.SIGHASH_ALL,
        value,
        signatureAlgorithm,
    ) {
        let witnessScript;

        this.transaction.sign(
            vin,
            keyPair,
            redeemScript,
            hashType,
            value,
            witnessScript,
            signatureAlgorithm,
        );
    }

    build() {
        if (this.p2shInput === true) return this.tx;
        return this.transaction.build();
    }
}

export default TransactionBuilder;
