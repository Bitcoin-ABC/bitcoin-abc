const log = require('./log');
const { outputScriptToAddress } = require('./utils');

module.exports = {
    getAliases: function (aliasTxHistory, aliasConstants) {
        const aliasTxCount = aliasTxHistory.length;

        // initialize array for all valid aliases
        const aliases = [];
        // iterate over history to get all alias:address pairs
        for (let i = 0; i < aliasTxCount; i += 1) {
            const thisAliasTx = aliasTxHistory[i];
            const parsedAliasTx = module.exports.parseAliasTx(
                thisAliasTx,
                aliasConstants,
            );
            if (parsedAliasTx) {
                aliases.push(parsedAliasTx);
            }
        }
        return { aliasTxCount, aliases };
    },
    parseAliasTx: function (aliasTx, aliasConstants) {
        // Input: a single tx from chronik tx history
        // output: false if invalid tx
        // output: {address: 'address', alias: 'alias', txid} if valid
        // validate for alias tx

        // Assume P2PKH for now. Add P2SH support in later diff.
        const inputZeroOutputScript = aliasTx.inputs[0].outputScript;

        const registeringAddress = outputScriptToAddress(inputZeroOutputScript);

        // Initialize vars used later for validation
        let aliasFeePaidSats = BigInt(0);
        let alias;
        let aliasLength;

        // Iterate over outputs
        const outputs = aliasTx.outputs;
        for (let i = 0; i < outputs.length; i += 1) {
            const { value, outputScript } = outputs[i];
            // If value is 0, parse for OP_RETURN
            if (value === '0') {
                // Check for valid alias prefix
                const validAliasPrefix =
                    outputScript.slice(0, 12) ===
                    `6a04${aliasConstants.opCodePrefix}`;

                if (!validAliasPrefix) {
                    return false;
                }
                log(`Valid alias prefix`);

                // Check for valid alias length
                const aliasLengthHex = outputScript.slice(12, 14);
                aliasLength = parseInt(aliasLengthHex, 16);
                log(`aliasLength`, aliasLength);

                // Parse for the alias
                const aliasHex = outputScript.slice(14, outputScript.length);
                alias = Buffer.from(aliasHex, 'hex').toString('utf8');
                log(`alias`, alias);

                const validAliasLength =
                    aliasLength <= aliasConstants.maxLength &&
                    aliasHex.length === 2 * aliasLength;

                if (!validAliasLength) {
                    return false;
                }
                log(`Valid alias length`);
            } else {
                // Check if output is p2pkh for the alias registration hash160
                if (
                    outputScript ===
                    `76a914${aliasConstants.registrationHash160}88ac`
                )
                    // If so, then the value here is part of the alias registration fee, aliasFeePaidSats
                    aliasFeePaidSats += BigInt(value);
            }
        }
        // Confirm that the correct fee is paid to the correct address
        if (
            parseInt(aliasFeePaidSats) !==
            aliasConstants.registrationFeesSats[aliasLength]
        ) {
            log(
                `Invalid fee. This transaction paid ${aliasFeePaidSats} sats to register ${alias}. The correct fee for an alias of ${aliasLength} characters is ${aliasConstants.registrationFeesSats[aliasLength]}`,
            );
            return false;
        } else {
            log(`Valid registration fee`);
        }
        return {
            address: registeringAddress,
            alias,
            txid: aliasTx.txid,
        };
    },
};
