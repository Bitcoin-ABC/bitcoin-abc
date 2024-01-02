import * as slpMdm from 'slp-mdm';

/**
 * Get targetOutput for a SLP v1 genesis tx
 * @param {object} genesisConfig object containing token info for genesis tx
 * @throws {error} if invalid input params are passed to slpMdm.TokenType1.genesis
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
    const script = slpMdm.TokenType1.genesis(
        ticker,
        name,
        documentUrl,
        documentHash,
        decimals,
        mintBatonVout,
        // Per spec, this must be BN of an integer
        // It may actually be a decimal value, but this is determined by the decimals param
        new slpMdm.BN(initialQty).times(10 ** decimals),
    );

    // Create output
    return { value: 0, script };
};
