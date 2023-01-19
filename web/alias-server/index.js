const { getTxHistory } = require('./chronik');
const config = require('./config');

async function testTxHistory() {
    const aliasTxHistory = await getTxHistory(config.aliasHash160);
    console.log(`aliasTxHistory`, aliasTxHistory);
}

testTxHistory();
