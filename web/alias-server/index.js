const config = require('./config');
const log = require('./log');
const { getAllTxHistory } = require('./chronik');
const { getAliases } = require('./alias.js');

async function testTxHistory() {
    const aliasTxHistory = await getAllTxHistory(
        config.aliasConstants.registrationHash160,
    );
    log(`aliasTxHistory`, aliasTxHistory);
    if (aliasTxHistory) {
        log(`aliasTxHistory.length`, aliasTxHistory.length);
    }
    await getAliases(config.aliasConstants.registrationHash160);
}

testTxHistory();
