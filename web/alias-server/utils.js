const cashaddr = require('ecashaddrjs');
const config = require('./config');

module.exports = {
    outputScriptToAddress: function (outputScript) {
        // returns P2SH or P2PKH address
        // P2PKH addresses are in outputScript of type 76a914...88ac
        // P2SH addresses are in outputScript of type a914...87
        // Return false if cannot determine P2PKH or P2SH address

        const typeTestSlice = outputScript.slice(0, 4);
        let addressType;
        let hash160;
        switch (typeTestSlice) {
            case '76a9':
                addressType = 'P2PKH';
                hash160 = outputScript.substring(
                    outputScript.indexOf('76a914') + '76a914'.length,
                    outputScript.lastIndexOf('88ac'),
                );
                break;
            case 'a914':
                addressType = 'P2SH';
                hash160 = outputScript.substring(
                    outputScript.indexOf('a914') + 'a914'.length,
                    outputScript.lastIndexOf('87'),
                );
                break;
            default:
                return false;
        }
        // Test hash160 for correct length
        if (hash160.length !== 40) {
            return false;
        }

        const buffer = Buffer.from(hash160, 'hex');

        // Because ecashaddrjs only accepts Uint8Array as input type, convert
        const hash160ArrayBuffer = new ArrayBuffer(buffer.length);
        const hash160Uint8Array = new Uint8Array(hash160ArrayBuffer);
        for (let i = 0; i < hash160Uint8Array.length; i += 1) {
            hash160Uint8Array[i] = buffer[i];
        }

        // Encode ecash: address
        const ecashAddress = cashaddr.encode(
            'ecash',
            addressType,
            hash160Uint8Array,
        );

        return ecashAddress;
    },
    getValidAliasTxsToBeAddedToDb: function (validAliasesInDb, validAliasTxs) {
        /*
        - See if any tx exist in validAliasTxs and not in validAliasesinDb
        - Return validAliasTxsToBeAddedToDb, an array of these aliases
        - Note that validAliasesInDb and validAliasTxs are sorted by blockheight
        */
        const validAliasTxsToBeAddedToDbCount =
            validAliasTxs.length - validAliasesInDb.length;
        if (validAliasTxsToBeAddedToDbCount > 0) {
            const validAliasTxsToBeAddedToDb = validAliasTxs.slice(
                -validAliasTxsToBeAddedToDbCount,
            );
            return validAliasTxsToBeAddedToDb;
        } else {
            return [];
        }
    },
    generateReservedAliasTxArray: function () {
        const reservedAliasTxs = [];
        for (
            let i = 0;
            i < config.aliasConstants.reservedAliases.length;
            i += 1
        ) {
            reservedAliasTxs.push({
                address: config.aliasConstants.address,
                alias: config.aliasConstants.reservedAliases[i],
                blockheight: 1,
                txid: 'reserved',
            });
        }
        return reservedAliasTxs;
    },
    getAliasFromHex: function (aliasHex) {
        return Buffer.from(aliasHex, 'hex').toString('utf8');
    },
    getHexFromAlias: function (alias) {
        return Buffer.from(alias, 'utf8').toString('hex');
    },
    getAliasBytecount: function (alias) {
        const aliasHex = module.exports.getHexFromAlias(alias);
        const aliasByteCount = aliasHex.length / 2;
        return aliasByteCount;
    },
};
