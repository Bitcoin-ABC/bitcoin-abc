import { BN, TokenType1 } from 'slp-mdm';
import appConfig from 'config/app';
import cashaddr from 'ecashaddrjs';

/**
 * Get targetOutput for a SLP v1 genesis tx
 * @param {object} genesisConfig object containing token info for genesis tx
 * @param {string} mintAddress the address minting this token
 * @throws {error} if invalid input params are passed to TokenType1.genesis
 * @returns {object} targetOutput, e.g. {value: 0, script: <encoded slp genesis script>}
 */
export const getSlpGenesisTargetOutput = (genesisConfig, mintAddress) => {
    const {
        ticker,
        name,
        documentUrl,
        documentHash,
        decimals,
        mintBatonVout,
        initialQty,
    } = genesisConfig;

    const targetOutputs = [];

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

    // Per SLP v1 spec, OP_RETURN must be at index 0
    // https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#genesis---token-genesis-transaction
    targetOutputs.push({ value: 0, script });

    // Per SLP v1 spec, genesis tx is minted to output at index 1
    // In Cashtab, we mint genesis txs to our own Path1899 address
    // Note, we do not validate the mintAddress here. The tx will fail if it is not a valid address.
    targetOutputs.push({ value: appConfig.etokenSats, address: mintAddress });

    // TODO support mint batons
    // For now, we only support fixed-supply SLP 1 tokens in Cashtab

    // Create output
    return targetOutputs;
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
        (total, tokenUtxo) => total.plus(new BN(tokenUtxo.slpToken.amount)),
        new BN(0),
    );

    if (totalTokenQty.lt(finalSendTokenQty)) {
        throw new Error(
            `tokenUtxos have insufficient balance ${totalTokenQty
                .shiftedBy(-1 * decimals)
                .toLocaleString('en-us', {
                    minimumFractionDigits: decimals,
                })} to send ${finalSendTokenQty
                .shiftedBy(-1 * decimals)
                .toLocaleString('en-us', {
                    minimumFractionDigits: decimals,
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

/**
 * Get targetOutput(s) for a SLP v1 BURN tx
 * Note: a burn tx is a special case of a send tx, where you only have a change output
 * i.e., to burn all balance, say you have 100 BURN tokens
 * you send yourself an etoken tx with output of 0 from input of 100. Now it's all burned.
 * If you send that 100-balance utxo to yourself with an output of 99, now you've burned 1.
 * @param {array} tokenUtxos the token utxos required to complete this tx
 * @param {string} burnQty the amount of this token to be burned in this tx
 * @throws {error} if invalid input params are passed to TokenType1.send
 * @returns {object} targetOutput, e.g. {value: 0, script: <encoded slp burn script>}
 */
export const getSlpBurnTargetOutput = (tokenUtxos, burnQty) => {
    if (typeof burnQty !== 'string') {
        throw new Error('burnQty must be a string');
    }
    // Get tokenId and decimals from the tokenUtxo
    const { tokenId, decimals } = tokenUtxos[0];

    // Account for token decimals
    const finalBurnTokenQty = new BN(burnQty).times(10 ** decimals);

    // Calculate the total qty of this token in tokenUtxos
    const totalTokenQty = tokenUtxos.reduce(
        (total, tokenUtxo) => total.plus(new BN(tokenUtxo.slpToken.amount)),
        new BN(0),
    );

    if (totalTokenQty.lt(finalBurnTokenQty)) {
        throw new Error(
            `tokenUtxos have insufficient balance ${totalTokenQty
                .shiftedBy(-1 * decimals)
                .toLocaleString('en-US', {
                    minimumFractionDigits: decimals,
                })} to burn ${finalBurnTokenQty
                .shiftedBy(-1 * decimals)
                .toLocaleString('en-US', {
                    minimumFractionDigits: decimals,
                })}`,
        );
    }

    // Calculate token change
    const tokenChange = totalTokenQty.minus(finalBurnTokenQty);

    // Unlike getSlpSendTargetOutputs, you always return one change output here
    // If tokenChange is 0, you are burning the full balance
    const script = TokenType1.send(tokenId, [tokenChange]);
    return { value: 0, script };
};
