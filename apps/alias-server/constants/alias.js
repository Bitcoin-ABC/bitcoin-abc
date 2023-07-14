// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';

module.exports = {
    // Per spec at https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/ecash-alias.md
    // A valid alias registration outputScript must have protocol identifier pushed by '04'
    outputScriptStartsWith: '6a042e786563',
    registrationAddress: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
    minLength: 1,
    maxLength: 21,
    minPriceChangeNotificationBlocks: 1000,
    /**
     * prices
     * alias registration fee for aliases of each valid length
     * alias prices come into effect at a "startHeight", the blockheight at which these prices are valid
     * The prices corresponding to the highest startHeight in prices are the current active alias prices
     * prices is sorted by prices[i].startHeight, highest to lowest
     */
    prices: [
        {
            startHeight: 785000, // Beta, will be set at launch blockheight when determined
            fees: {
                1: 558,
                2: 557,
                3: 556,
                4: 555,
                5: 554,
                6: 553,
                7: 552,
                8: 551,
                9: 551,
                10: 551,
                11: 551,
                12: 551,
                13: 551,
                14: 551,
                15: 551,
                16: 551,
                17: 551,
                18: 551,
                19: 551,
                20: 551,
                21: 551,
            },
        },
    ],
};
