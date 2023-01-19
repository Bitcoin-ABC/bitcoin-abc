/* log.js

  Display timestamp before log statements

*/

'use strict';

function log(msg, data) {
    const logStamp = new Date().toISOString();
    let formattedData;
    if (data) {
        formattedData = JSON.stringify(data, null, 2);
        console.log(`${logStamp}: ${msg}`, formattedData);
    } else {
        console.log(`${logStamp}: ${msg}`);
    }
}

module.exports = log;
