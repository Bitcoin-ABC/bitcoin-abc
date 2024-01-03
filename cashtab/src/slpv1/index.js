import { BN, TokenType1 } from 'slp-mdm';
import appConfig from 'config/app';
import cashaddr from 'ecashaddrjs';

/**
 * Get targetOutput for a SLP v1 genesis tx
 * @param {object} genesisConfig object containing token info for genesis tx
 * @throws {error} if invalid input params are passed to TokenType1.genesis
 * @returns {object} targetOutput, e.g. {value: 0, script: <encoded slp genesis script>}
 */
export const getSlpGenesisTargetOutput = genesisConfig => {
    const {
        ticker,
        name,
        documentUrl,
        documentHash,
        decimals,
        mintBatonVout,
        initialQty,
    } = genesisConfig;

    // Note that this function handles validation; will throw an error on invalid inputs
    const script = TokenType1.genesis(
        ticker,
        name,
        documentUrl,
        documentHash,
        decimals,
        mintBatonVout,
        // Per spec, this must be BN of an integer
        // It may actually be a decimal value, but this is determined by the decimals param
        new BN(initialQty).times(10 ** decimals),
    );

    // Create output
    return { value: 0, script };
};

/**
 * Get targetOutput(s) for a SLP v1 SEND tx
 * @param {array} tokenUtxos the token utxos required to complete this tx
 * @param {string} sendQty the amount of this token to be sent in this tx
 * @throws {error} if invalid input params are passed to TokenType1.send
 * @returns {array} targetOutput(s), e.g. [{value: 0, script: <encoded slp send script>}]
 * or [{value: 0, script: <encoded slp send script>}, {value: 546, address: <changeAddress>}]
 * if token change
 */
export const getSlpSendTargetOutputs = (tokenUtxos, sendQty) => {
    if (typeof sendQty !== 'string') {
        throw new Error('sendQty must be a string');
    }
    // Get tokenId and decimals from the tokenUtxo
    const { tokenId, decimals, address } = tokenUtxos[0];

    // Account for token decimals
    const finalSendTokenQty = new BN(sendQty).times(10 ** decimals);

    // Calculate the total qty of this token in tokenUtxos
    const totalTokenQty = tokenUtxos.reduce(
        (total, tokenUtxo) =>
            total.plus(new BN(tokenUtxo.tokenQty).times(10 ** decimals)),
        new BN(0),
    );

    if (totalTokenQty.lt(finalSendTokenQty)) {
        throw new Error(
            `tokenUtxos have insufficient balance ${totalTokenQty.toLocaleString(
                'en-us',
                { minimumFractionationDigits: decimals },
            )} to send ${finalSendTokenQty.toLocaleString('en-us', {
                minimumFractionationDigits: decimals,
            })}`,
        );
    }

    // Calculate token change
    const tokenChange = totalTokenQty.minus(finalSendTokenQty);

    // When token change output is required
    let script;
    if (tokenChange.gt(0)) {
        script = TokenType1.send(tokenId, [finalSendTokenQty, tokenChange]);

        return [
            { value: 0, script },
            // Add a change output
            // Note that txBuilder requires targetOutputs to use legacy format
            {
                value: appConfig.etokenSats,
                address: cashaddr.toLegacy(address),
            },
        ];
    } else {
        // no token change needed
        script = TokenType1.send(tokenId, [finalSendTokenQty]);
        return [{ value: 0, script }];
    }
};
