// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const opReturn = {
    opReserved: '50',
    opReturnPrefixHex: '6a',
    opReturnPrefixDec: '106',
    opPushDataOne: '4c',
    appPrefixesHex: {
        eToken: '534c5000',
        cashtab: '00746162',
        cashtabEncrypted: '65746162',
        airdrop: '64726f70',
        aliasRegistration: '2e786563',
        paybutton: '50415900',
        nftoa: '4e465400',
        eCashChat: '63686174',
        swap: '53575000',
        paywallPayment: '70617977',
        eCashChatArticle: '626c6f67',
        eCashChatArticleReply: '726c6f67',
        authPrefixHex: '61757468',
        xecx: '58454358',
        alp: '534c5032',
        agora: '41475230',
        solAddr: '534f4c30',
        dice: '44494345',
        roll: '524f4c4c',
        trophy: 'f09f8f86',
    },
    cashtabMsgByteLimit: 215,
    airdropMsgByteLimit: 182,
    opreturnParamByteLimit: 222,
};
