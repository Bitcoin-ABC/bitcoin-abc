const { getAllTxHistory } = require('./chronik');
const config = require('./config');

async function testTxHistory() {
    const aliasTxHistory = await getAllTxHistory(config.aliasHash160);
    console.log(`aliasTxHistory`, aliasTxHistory);
    if (aliasTxHistory) {
        console.log(`aliasTxHistory.length`, aliasTxHistory.length);
    }
}

testTxHistory();
