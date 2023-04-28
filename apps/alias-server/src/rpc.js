// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const axios = require('axios');

module.exports = {
    isFinalBlock: async function (rpcAuth, blockhash) {
        const rpcData = {
            jsonrpc: '1.0',
            id: 'isfinalblock',
            method: 'isfinalblock',
            params: [blockhash],
        };
        const rpcOptions = {
            timeout: 1000,
            auth: {
                username: rpcAuth.user,
                password: rpcAuth.password,
            },
        };

        let isFinalBlockResponse;
        try {
            isFinalBlockResponse = await axios.post(
                rpcAuth.url,
                rpcData,
                rpcOptions,
            );
            const { data } = isFinalBlockResponse;
            const { result, error } = data;
            // error will be null if you got a good node response
            if (error !== null) {
                // To be handled by catch loop below
                throw new Error(error);
            }
            // Result here will only be true or false, i.e. an error will be thrown if
            // we don't get a response of type data:{result: bool, error: null, id: 'isfinalblock'}

            // You only want true or false returned here
            return result === true;
        } catch (err) {
            // Check for an error response from the node
            if (
                err &&
                err.response &&
                err.response.data &&
                err.response.data.error
            ) {
                // e.g. you have a good connection but asked with blockhash 'foo'
                console.log(
                    `Node error from isFinalBlock`,
                    err.response.data.error,
                );
                return false;
            }
            // Error in isFinalBlock(foo) "timeout of 3000ms exceeded"
            console.log(
                `Error in isFinalBlock(${blockhash})`,
                err && err.message ? err.message : err,
            );
            return false;
        }
    },
};
