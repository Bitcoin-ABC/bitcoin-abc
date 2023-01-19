const config = require('./config');
const log = require('./log');
const { getAllTxHistory } = require('./chronik');

async function testTxHistory() {
    const aliasTxHistory = await getAllTxHistory(config.aliasHash160);
    log(`aliasTxHistory`, aliasTxHistory);
    if (aliasTxHistory) {
        log(`aliasTxHistory.length`, aliasTxHistory.length);
    }
}

testTxHistory();
