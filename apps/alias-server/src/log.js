// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/* 
  For objects and arrays, print full contents to log
*/

'use strict';

function log(msg, data) {
    let formattedData;
    if (typeof data !== 'undefined') {
        formattedData = JSON.stringify(data, null, 2);
        console.log(msg, formattedData);
    } else {
        console.log(msg);
    }
}

module.exports = log;
