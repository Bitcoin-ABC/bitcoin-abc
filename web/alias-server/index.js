const config = require('./config');
const { getAllTxHistory } = require('./chronik');
const { getAliases } = require('./alias.js');
const fs = require('fs');

async function testTxHistory() {
    const aliasTxHistory = await getAllTxHistory(
        config.aliasConstants.registrationHash160,
    );
    console.log(`aliasTxHistory`, aliasTxHistory);
    // write this to a file for test mock
    fs.writeFileSync(
        './test/mocks/txHistoryFeb7.json',
        JSON.stringify(aliasTxHistory, null, 2),
        'utf-8',
    );
    const aliases = getAliases(aliasTxHistory);

    // write this to a file for test mock
    fs.writeFileSync(
        './test/mocks/aliasesFeb7.json',
        JSON.stringify(aliases, null, 2),
        'utf-8',
    );
}

testTxHistory();
//getAliases();
