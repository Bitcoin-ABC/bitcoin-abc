import { parseOpReturn, generateOpReturnScript } from 'utils/cashMethods';
import aliasSettings from 'config/alias';

/**
 * Calculates the byte size of the alias input
 *
 * @param {string} aliasInputStr the alias input
 * @returns {number} aliasInputByteSize the byte size of the alias input
 */
export const getAliasByteSize = aliasInputStr => {
    if (!aliasInputStr || aliasInputStr.trim() === '') {
        return 0;
    }

    // generate the OP_RETURN script
    const opReturnData = generateOpReturnScript(
        aliasInputStr,
        false, // encryption use
        false, // airdrop use
        null, // airdrop use
        null, // encrypted use
        true, // alias registration flag
    );
    // extract the alias input from the OP_RETURN script and check the backend size
    const hexString = opReturnData.toString('hex'); // convert to hex
    const opReturnAlias = parseOpReturn(hexString)[1]; // extract the alias
    const aliasInputByteSize = opReturnAlias.length / 2; // calculate the byte size

    return aliasInputByteSize;
};

/**
 * Queries the alias-server for alias related data via Fetch
 *
 * @param {string} endPoint the alias-server endpoint for this query
 * @param {string} aliasParam a param to be passed to the endPoint
 * @returns {JSON} a JSON response from alias-server via Fetch
 * @throws {error} err server fetch errors from alias-server
 *
 * Example `/address/<address>` response
 *   [
 *       {alias: 'foo', address: 'ecash:qpmyt....', txid: 'ec927447...', blockheight: '792417'},
 *       {alias: 'foo2', address: 'ecash:qpmyt....', txid: 'ec927447...', blockheight: '792417'},
 *   ]
 * Example `/alias/<alias>` response for a registered alias:
 *   {
 *        alias: 'twelvechar12',
 *        address:'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
 *        txid:'166b21d4631e2a6ec6110061f351c9c3bfb3a8d4e6919684df7e2824b42b0ffe',
 *        blockheight:792419,
 *   }
 * Example `/alias/<alias>` response for an unregistered alias:
 *  {
 *        alias: 'asdfasdf',
 *        isRegistered: false,
 *        registrationFeeSats: 551,
 *        processedBlockheight: 802965,
 *  }
 */
export const queryAliasServer = async (endPoint, aliasParam) => {
    let aliasServerResp;
    try {
        aliasServerResp = await fetch(
            aliasSettings.aliasServerBaseUrl +
                '/' +
                endPoint +
                '/' +
                aliasParam,
        );
        // if alias-server is down, fetch returns undefined
        if (!aliasServerResp) {
            throw new Error('Network request failed');
        }
        // if alias-server returns a valid error message to the query e.g. address not found
        if (aliasServerResp.error) {
            throw new Error(aliasServerResp.error);
        }
        return await aliasServerResp.json();
    } catch (err) {
        console.log(
            `queryAliasServer(): Error retrieving alias data from alias-server`,
            err,
        );
        console.log(
            `/${endPoint}/ endpoint output: ${JSON.stringify(aliasServerResp)}`,
        );
        throw err;
    }
};
