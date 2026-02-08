// Copyright (c) 2023 The Bitcoin developers
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
        cashtabEncrypted: '65746162', // Preserve here for use in tx processing
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
        solAddr: '534f4c30', // SOL0
        dice: '44494345', // DICE
        roll: '524f4c4c', // ROLL
    },
    /* The max payload per spec is 220 bytes (or 223 bytes including +1 for OP_RETURN and +2 for pushdata opcodes)
       Within this 223 bytes, transaction building will take up 8 bytes, hence cashtabMsgByteLimit is set to 215 bytes
       i.e.
        6a
        04
        [prefix byte]
        [prefix byte]
        [prefix byte]
        [prefix byte]
        4c [next byte is pushdata byte]
        [pushdata byte] (d7 for 215 on a max-size Cashtab msg)
    */
    cashtabMsgByteLimit: 215,
    // Airdrop spec is <OP_RETURN> <Airdrop protocol identifier> <tokenId> <optionalMsg>
    // in bytes, = 1 + (1 + 4) + (1 + 32) + (1 or 2 + LIMIT)
    // airdropMsgByteLimit = 182 = 223 - 1 - 5 - 33 - 2
    airdropMsgByteLimit: 182,
    opreturnParamByteLimit: 222,
};
