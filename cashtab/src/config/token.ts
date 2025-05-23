// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const token = {
    tokenIconSubmitApi: 'https://api.etokens.cash/new',
    tokenIconsUrl: 'https://icons.etokens.cash',
    tokenDbUrl: 'https://tokendb.kingbch.com',
    newTokenDefaultUrl: 'cashtab.com',
    rewardsServerBaseUrl: 'https://rewards.etokens.cash',
    blacklistServerUrl: 'https://etokens.cash',
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
        '2a33476bcd30bfbc5e57fb33da26f641020a53c925db7394e6d3b8eecf82e2ec',
        'b69dcc90c72e852e1dc712704cb376e588cee6266a51e647c61a724c00625cc8',
        // fake facebook/meta
        '7c14895521c158798478a64d146f67f22e1c8c5b962422ed47636fda71d82f1d',
        '6f231d49fefd938a9a6b4e6b93d14c7127e11bd5621056eb9c6528164b9d7ce0',
        // "coca cola" submitted with coca colo logo
        'a6a16ac38d37e35c9f9eb81e9014827cef9da105a94607ec16a2c6e76224d098',
        'db2e95abe66f6b1f21a860a177b7a73565182185a99b6043b5183f59df7ecfbf',
        // fake raipay
        '4c008a1cd5002063d2942daed16ff0e118bc3e41c7c0a4155ac096ee5a389c21',
        // fake worldcoin
        '4a8bf0102dba2092ed1047ce355d8848d83324d4c2c45f4e4cd3712c5715c25d',
        // fake picoin
        '8bf3dd3afdc802583eb8f2aeb6705a16d3f6fdfe39a1579d8b550ac0c7aebe2f',
    ],
    /**
     * Now that we have some "known" vol tokens, load only these
     * unless the user manually elects to "load all offers". We will
     * improve how this list is built and maintained going forward
     * (establish inclusion metrics)
     *
     * NB this array should be sorted alphabetical by tokenId
     * Otherwise, the listings will "jump" to sort themselves this way
     * after they load
     */
    whitelist: [
        // FIRMA
        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
        // Star crystals
        'ac31bb0bccf33de1683efce4da64f1cb6d8e8d6e098bc01c51d5864deb0e783f',
        // XECX
        'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
        // POW
        'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
    ],
};
