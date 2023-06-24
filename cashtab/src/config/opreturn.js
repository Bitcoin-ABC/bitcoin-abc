// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

export const opReturn = {
    opReturnPrefixHex: '6a',
    opReturnPrefixDec: '106',
    opPushDataOne: '4c',
    appPrefixesHex: {
        eToken: '534c5000',
        cashtab: '00746162',
        cashtabEncrypted: '65746162',
        airdrop: '64726f70',
        aliasRegistration: '2e786563',
    },
    /* encryptedMsgByteLimit context:
    As per `convertToEncryptStruct()` in cashMethods.js which breaks down the ecies-lite library's encryption logic, the encrypted OP_RETURN message that follows pushdata1 (4c) and pushdata (d1) prefixes is 209 bytes, based on a 127 byte message supplied via the frontend.
    These 209 bytes can be broken down into the following:
    - ivbufParam: 16 bytes
    - publicKey: 33 bytes
    - ctbufParam: 128 bytes
    - macParam: 32 bytes
    These byte sizes can be verified via debug logs in `convertToEncryptStruct`.
    The `ctbufParam` is the cipher text buffer, which is the encrypted message content. The other params (ivbuf, pubkey, mac) are all there to validate that the encryption has not been tampered with and facilitate the decryption.
    Based on testing, adding one more character to the message input (127+ bytes in cashtab frontend) will translate to an encryption output message (ivbuf + pubkey + ctbuf + mac) that is larger than 215 bytes (`unencryptedMsgByteLimit`).
    Therefore this encrypted bytesize limit is not derived as a constant delta from `unencryptedMsgByteLimit` like the airdrop message limit.
    */
    encryptedMsgByteLimit: 127,
    /* The max payload per spec is 220 bytes (or 223 bytes including +1 for OP_RETURN and +2 for pushdata opcodes)
       Within this 223 bytes, transaction building will take up 8 bytes, hence unencryptedMsgByteLimit is set to 215 bytes
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
    unencryptedMsgByteLimit: 215,
};
