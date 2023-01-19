const config = require('./config');
const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient(config.chronik);

module.exports = {
    getTxHistory: async function (hash160) {
        let txHistory;
        try {
            txHistory = await chronik
                .script('p2pkh', hash160)
                // Get the 25 most recent transactions
                .history(/*page=*/ 0, /*page_size=*/ 25);
            return txHistory;
        } catch (err) {
            console.log(
                `Error in chronik.script('p2pkh', ${hash160}).history()`,
            );
            console.log(err);
        }
    },
};
