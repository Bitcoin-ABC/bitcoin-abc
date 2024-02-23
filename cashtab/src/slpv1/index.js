import { BN, TokenType1 } from 'slp-mdm';
import appConfig from 'config/app';

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
    targetOutputs.push({
        value: appConfig.etokenSats,
        address: mintAddress,
    });

    // TODO support mint batons
    // For now, we only support fixed-supply SLP 1 tokens in Cashtab

    // Create output
    return targetOutputs;
};

/**
 * Get targetOutput(s) for a SLP v1 SEND tx
 * @param {array} tokenInputInfo {tokenUtxos: utxos[], sendAmount: BigNumber[]}; Output of getSendTokenInputs
 * @param {string} destinationAddress address where the tokens are being sent
 * @throws {error} if invalid input params are passed to TokenType1.send
 * @returns {array} targetOutput(s), e.g. [{value: 0, script: <encoded slp send script>}]
 * or [{value: 0, script: <encoded slp send script>}, {value: 546}]
 * if token change
 * Change output has no address key, same behavior as ecash-coinselect
 */
export const getSlpSendTargetOutputs = (tokenInputInfo, destinationAddress) => {
    const { tokenInputs, sendAmounts } = tokenInputInfo;

    const utxosFromNng = !('token' in tokenInputs[0]);

    // Get tokenId from the tokenUtxo
    let tokenId;
    if (utxosFromNng) {
        // ChronikClient NNG
        tokenId = tokenInputs[0].tokenId;
    } else {
        // ChronikClientNode
        tokenId = tokenInputs[0].token.tokenId;
    }

    const script = TokenType1.send(tokenId, sendAmounts);

    // Build targetOutputs per slpv1 spec
    // https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#send---spend-transaction

    // Initialize with OP_RETURN at 0 index, per spec
    const targetOutputs = [{ value: 0, script }];

    // Add first 'to' amount to 1 index. This could be any index between 1 and 19.
    targetOutputs.push({
        value: appConfig.etokenSats,
        address: destinationAddress,
    });

    // sendAmounts can only be length 1 or 2
    if (sendAmounts.length > 1) {
        // Add another targetOutput
        // Note that change addresses are added after ecash-coinselect by wallet
        // Change output is denoted by lack of address key
        targetOutputs.push({
            value: appConfig.etokenSats,
        });
    }

    return targetOutputs;
};

/**
 * Get all available token utxos for an SLP v1 SEND tx from NNG or in-node formatted chronik utxos
 * @param {array} utxos array of utxos from an in-node instance of chronik
 * @param {string} tokenId
 * @returns {array} tokenUtxos, all utxos that can be used for slpv1 send tx
 * mint batons are intentionally excluded
 */
export const getAllSendUtxos = (utxos, tokenId) => {
    // From an array of chronik utxos, return only token utxos related to a given tokenId
    return utxos.filter(utxo => {
        if (
            (utxo.token?.tokenId === tokenId && // UTXO matches the token ID.
                utxo.token?.isMintBaton === false) || // UTXO is not a minting baton.
            (utxo.tokenId === tokenId && utxo.slpToken.isMintBaton === false)
        ) {
            return true;
        }
        return false;
    });
};

/**
 * Get send token inputs from NNG input data
 * @param {array} utxos
 * @param {string} tokenId tokenId of the token you want to send
 * @param {string} sendQty
 * @param {number} decimals 0-9 inclusive, integer. Decimals of this token.
 * Note: you need to get decimals from cache or from chronik.
 * @returns {object} {tokenInputs: utxo[], sendAmounts: BN[]}
 */
export const getSendTokenInputs = (utxos, tokenId, sendQty, decimals = -1) => {
    if (sendQty === '') {
        throw new Error(
            'Invalid sendQty empty string. sendQty must be a decimalized number as a string.',
        );
    }

    // Get all slp send utxos for this tokenId
    const allSendUtxos = getAllSendUtxos(utxos, tokenId);

    if (allSendUtxos.length === 0) {
        throw new Error(`No token utxos for tokenId "${tokenId}"`);
    }

    const modelUtxo = allSendUtxos[0];

    // If this is NNG chronik you can get decimals from a token utxos
    const isNng = 'decimals' in modelUtxo;

    decimals = isNng ? allSendUtxos[0].decimals : decimals;

    if (!Number.isInteger(decimals) || decimals > 9 || decimals < 0) {
        // We get there if we have non-nng utxos and we call this function without specifying decimals
        throw new Error(
            `Invalid decimals ${decimals} for tokenId ${tokenId}. Decimals must be an integer 0-9.`,
        );
    }

    sendQty = new BN(sendQty).times(10 ** decimals);

    let totalTokenInputUtxoQty = new BN(0);

    const tokenInputs = [];
    for (const utxo of allSendUtxos) {
        totalTokenInputUtxoQty = isNng
            ? totalTokenInputUtxoQty.plus(utxo.slpToken.amount)
            : totalTokenInputUtxoQty.plus(utxo.token.amount);

        tokenInputs.push(utxo);
        if (totalTokenInputUtxoQty.gte(sendQty)) {
            // If we have enough to send what we want, no more input utxos
            break;
        }
    }

    if (totalTokenInputUtxoQty.lt(sendQty)) {
        throw new Error(
            `tokenUtxos have insufficient balance ${totalTokenInputUtxoQty
                .shiftedBy(-1 * decimals)
                .toFixed(decimals)} to send ${sendQty
                .shiftedBy(-1 * decimals)
                .toFixed(decimals)}`,
        );
    }

    const sendAmounts = [sendQty];
    const change = totalTokenInputUtxoQty.minus(sendQty);
    if (change.gt(0)) {
        sendAmounts.push(change);
    }

    // We return this interesting object due to expected input shape of slp-mdm
    // NB sendAmounts must be an array of BNs, each one decimalized to the tokens decimal places
    return { tokenInputs, sendAmounts };
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
