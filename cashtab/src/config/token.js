// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

export const token = {
    tokenIconSubmitApi: 'https://api.etokens.cash/new',
    tokenIconsUrl: 'https://icons.etokens.cash',
    tokenDbUrl: 'https://tokendb.kingbch.com',
    newTokenDefaultUrl: 'cashtab.com',
    rewardsServerBaseUrl: 'https://rewards.etokens.cash',
    blacklist: [
        // fake blazer
        '09c53c9a9fe0df2cb729dd6f99f2b836c59b842d6652becd85658e277caab611',
        // fake bux
        '9c662233f8553e72ab3848a37d72fbc3f894611aae43033cde707213a537bba0',
        // various USD impersonators
        '6dcb149e77a8f86a85d2fb8505dadb194994a922102fcea6309f2818de9ee173',
        '059308a0d6ef0443d8bd014ac85f830d98780b1ce53bc2326680ed27e99803f6',
        '2a328dbe125bd0ef8d199b2b4f20ce84bb36a7c0d12246668163a6077d4f494b',
        '3387978c85f382632ecb5cdc23c4912c4c22688790d9264f84c3c1351c049719',
        '07da70e787181ac67a34f9292b4e13a93cd081e4ca540a8ddafe4cc86ee26e2d',
    ],
};
