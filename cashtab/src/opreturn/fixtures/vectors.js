// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { opReturn } from 'config/opreturn';
import { Script, fromHex } from 'ecash-lib';

// Test vectors for opreturn output generating functions

export const opReturnVectors = {
    cashtabMsgs: {
        expectedReturns: [
            {
                description: 'Alphanumeric string',
                cashtabMsg: 'This is a Cashtab Msg',
                returned: {
                    value: 0,
                    script: new Script(
                        fromHex(
                            '6a0400746162155468697320697320612043617368746162204d7367',
                        ),
                    ),
                },
            },
            {
                description: 'String with emojis',
                cashtabMsg: '🙏📬🫡👀🕵️👑🎃🪖🐋🎯',
                returned: {
                    value: 0,
                    script: new Script(
                        fromHex(
                            '6a04007461622bf09f998ff09f93acf09faba1f09f9180f09f95b5efb88ff09f9191f09f8e83f09faa96f09f908bf09f8eaf',
                        ),
                    ),
                },
            },
            {
                description: 'String of max length for Cashtab Msg',
                cashtabMsg:
                    '00000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000112345',
                returned: {
                    value: 0,
                    script: new Script(
                        fromHex(
                            '6a04007461624cd73030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313132333435',
                        ),
                    ),
                },
            },
        ],
        expectedErrors: [
            {
                description:
                    'String exceeding max length for Cashtab Msg by 1 byte',
                cashtabMsg:
                    '000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001123456',
                errorMsg: `Cashtab msg is 216 bytes. Exceeds ${opReturn.cashtabMsgByteLimit} byte limit.`,
            },
            {
                description: 'non-string input',
                cashtabMsg: { cashtabMsg: 'good to go' },
                errorMsg: 'getCashtabMsgTargetOutput requires string input',
            },
            {
                description: 'Empty string',
                cashtabMsg: '',
                errorMsg: 'Cashtab Msg cannot be an empty string',
            },
        ],
    },
    airdrops: {
        expectedReturns: [
            {
                description: 'Airdrop with no optional msg',
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                airdropMsg: '',
                returned: {
                    value: 0,
                    script: new Script(
                        fromHex(
                            '6a0464726f702050d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                        ),
                    ),
                },
            },
            {
                description:
                    'Airdrop with many spaces for optional msg treated as no optional msg',
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                airdropMsg: '          ',
                returned: {
                    value: 0,
                    script: new Script(
                        fromHex(
                            '6a0464726f702050d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                        ),
                    ),
                },
            },
            {
                description: 'Airdrop with optional alphanumeric msg',
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                airdropMsg: 'Test airdrop msg',
                returned: {
                    value: 0,
                    script: new Script(
                        fromHex(
                            '6a0464726f702050d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e10546573742061697264726f70206d7367',
                        ),
                    ),
                },
            },
            {
                description:
                    'Airdrop with optional emoji and special characters msg',
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                airdropMsg:
                    '30~40 프로 상승으로 만족못하겠으니 300~400프로 펌핑 함 가즈아~ 시체밭넘고~🤔',
                returned: {
                    value: 0,
                    script: new Script(
                        fromHex(
                            '6a0464726f702050d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e4c6833307e343020ed9484eba19c20ec8381ec8ab9ec9cbceba19c20eba78ceca1b1ebaabbed9598eab2a0ec9cbceb8b88203330307e343030ed9484eba19c20ed8e8ced959120ed95a820eab080eca688ec95847e20ec8b9cecb2b4ebb0adeb8498eab3a07ef09fa494',
                        ),
                    ),
                },
            },
            {
                description:
                    'Airdrop with optional msg of max allowable length',
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                airdropMsg:
                    '00000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000112',
                returned: {
                    value: 0,
                    script: new Script(
                        fromHex(
                            '6a0464726f702050d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e4cb63030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313132',
                        ),
                    ),
                },
            },
        ],
        expectedErrors: [
            {
                description: 'Invalid tokenId provided',
                tokenId:
                    '0d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                airdropMsg:
                    '000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001123',
                errorMsg: `Invalid tokenId: 0d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e`,
            },
            {
                description:
                    'Airdrop msg exceeding max length for airdrop msg by 1 byte',
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                airdropMsg:
                    '000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001123',
                errorMsg: `Airdrop msg is 183 bytes. Exceeds ${opReturn.airdropMsgByteLimit} byte limit.`,
            },
            {
                description: 'non-string input for airdrop msg',
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                airdropMsg: { airdropMsg: 'good to go' },
                errorMsg:
                    'getAirdropTargetOutput requires string input for tokenId and airdropMsg',
            },
        ],
    },
    cashtabMsgByteCounts: {
        expectedReturns: [
            {
                description: 'a single emoji',
                cashtabMsg: '🙈',
                byteCount: 4,
            },
            {
                description: 'msg input with characters and emojis',
                cashtabMsg: 'monkey🙈',
                byteCount: 10,
            },
            {
                description: 'msg input with special characters',
                cashtabMsg: 'monkey©®ʕ•́ᴥ•̀ʔっ♡',
                byteCount: 33,
            },
            {
                description:
                    'msg input with a mixture of symbols, multilingual characters and emojis',
                cashtabMsg: '🙈©冰소주',
                byteCount: 15,
            },
            {
                description: 'Alphanumeric string',
                cashtabMsg: 'This is a Cashtab Msg',
                byteCount: 21,
            },
            {
                description: 'String with emojis',
                cashtabMsg: '🙏📬🫡👀🕵️👑🎃🪖🐋🎯',
                byteCount: 43,
            },
            {
                description: 'String of max length for Cashtab Msg',
                cashtabMsg:
                    '00000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000112345',
                byteCount: 215,
            },
        ],
        expectedErrors: [
            {
                description: 'non-text input',
                cashtabMsg: null,
                errorMsg: 'cashtabMsg must be a string',
            },
        ],
    },
    opreturnsAsParam: {
        expectedReturns: [
            {
                description: 'Valid opreturn param input',
                opreturnParam:
                    '0400746162155468697320697320612043617368746162204d7367',
                returned: {
                    value: 0,
                    script: new Script(
                        fromHex(
                            '6a0400746162155468697320697320612043617368746162204d7367',
                        ),
                    ),
                },
            },
            {
                description: 'Max length for opreturn param',
                opreturnParam:
                    '04007461624cd73030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313132333435',
                returned: {
                    value: 0,
                    script: new Script(
                        fromHex(
                            '6a04007461624cd73030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313132333435',
                        ),
                    ),
                },
            },
        ],
        expectedErrors: [
            {
                description: 'Invalid opreturn param input',
                opreturnParam:
                    '6a0400746162155468697320697320612043617368746162204d7367',
                errorMsg: `Invalid opreturnParam "6a0400746162155468697320697320612043617368746162204d7367"`,
            },
        ],
    },
    parseOpReturnRaw: {
        expectedReturns: [
            {
                description:
                    'Returns protocol identifier and raw hex for an SLP tx',
                opReturnRaw:
                    '04534c500001010453454e44206f703bffa22803003c2e69af42c2b765e107ac30fcd516b95d0e00e5f668d0e308000000000000006408000000e8d4a4f318',
                returned: {
                    protocol: 'SLP',
                    data: '04534c500001010453454e44206f703bffa22803003c2e69af42c2b765e107ac30fcd516b95d0e00e5f668d0e308000000000000006408000000e8d4a4f318',
                },
            },
            {
                description:
                    'Returns protocol identifier and decoded message for a valid Cashtab msg',
                opReturnRaw:
                    '0400746162356c6574277320676f6f6f6f6f6f6f206543617368203d20656c656374726f6e696320436173680a58e3858ce384b7757272656e6379',
                returned: {
                    protocol: 'Cashtab Msg',
                    data: `let's gooooooo eCash = electronic Cash\nXㅌㄷurrency`,
                },
            },
            {
                description:
                    'Returns protocol identifier and decoded message for an invalid Cashtab msg',
                opReturnRaw: '0400746162',
                returned: {
                    protocol: 'Invalid Cashtab Msg',
                    data: '0400746162',
                },
            },
            {
                description:
                    'Returns protocol identifier and decoded message for an encrypted Cashtab msg',
                opReturnRaw: '04657461620101',
                returned: {
                    protocol: 'Encrypted Cashtab Msg',
                    data: '04657461620101',
                },
            },
            {
                description:
                    'Returns protocol identifier and tokenId for a valid airdrop with no msg',
                opReturnRaw:
                    '0464726f7020b76878b29eff39c8c28aaed7d18a166c20057c43beeb90b630264470983c984a',
                returned: {
                    protocol: 'Airdrop',
                    data: `Token ID: b76878b29eff39c8c28aaed7d18a166c20057c43beeb90b630264470983c984a`,
                },
            },
            {
                description:
                    'Returns protocol identifier and tokenId for a valid airdrop with msg',
                opReturnRaw:
                    '0464726f70209881f13f23babd28f37901003cc9dc3f84549496d3ff6c8a34c26deac5134fd94357656c636f6d652056696e6e61204c696d206a6f696e2023313635204d616c617973696120652e4361736820436f6d6d756e69747920436c6173736963205061737321',
                returned: {
                    protocol: 'Airdrop',
                    data: `Token ID: 9881f13f23babd28f37901003cc9dc3f84549496d3ff6c8a34c26deac5134fd9\nMsg: Welcome Vinna Lim join #165 Malaysia e.Cash Community Classic Pass!`,
                },
            },
            {
                description:
                    'Returns protocol identifier and raw hex for invalid airdrop',
                opReturnRaw: '0464726f70',
                returned: {
                    protocol: 'Invalid Airdrop',
                    data: `0464726f70`,
                },
            },
            {
                description:
                    'Returns protocol identifier and raw hex for valid alias registration',
                opReturnRaw:
                    '042e786563000c746573747465737474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                returned: {
                    protocol: 'Alias Registration',
                    data: `testtesttest to ecash:qqy4u704r4pxp0qdcwa8ldmu005j6raa6ys060u0ns`,
                },
            },
            {
                description:
                    'Returns protocol identifier and raw hex for invalid alias registration',
                opReturnRaw:
                    // bad address type
                    '042e786563000c746573747465737474657374150395e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                returned: {
                    protocol: 'Invalid Alias Registration',
                    data: `042e786563000c746573747465737474657374150395e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d`,
                },
            },
            {
                description: 'Valid paybutton with data and nonce',
                opReturnRaw: '0450415900000474657374080102030405060708',
                returned: {
                    protocol: 'PayButton',
                    data: 'Data: test, Nonce: 0102030405060708',
                },
            },
            {
                description: 'Valid paybutton with no data and nonce',
                opReturnRaw: '04504159000000080102030405060708',
                returned: {
                    protocol: 'PayButton',
                    data: 'Nonce: 0102030405060708',
                },
            },
            {
                description: 'Valid paybutton with data and no nonce',
                opReturnRaw: '045041590000047465737400',
                returned: {
                    protocol: 'PayButton',
                    data: 'Data: test',
                },
            },
            {
                description: 'Valid empty paybutton',
                opReturnRaw: '0450415900000000',
                returned: {
                    protocol: 'PayButton',
                    data: '',
                },
            },
            {
                description: 'Invalid paybutton',
                opReturnRaw: '045041590000',
                returned: {
                    protocol: 'Invalid PayButton',
                    data: '045041590000',
                },
            },
            {
                description: 'Valid eCash chat',
                opReturnRaw: '046368617409746573742063686174',
                returned: {
                    protocol: 'eCash Chat',
                    data: 'test chat',
                },
            },
            {
                description: 'Invalid eCash chat',
                opReturnRaw: '0463686174',
                returned: {
                    protocol: 'Invalid eCash Chat',
                    data: '0463686174',
                },
            },
            {
                description: 'Returns unknown for unknown OP_RETURN',
                opReturnRaw: '04deadbeef',
                returned: {
                    protocol: 'Unknown Protocol',
                    data: '04deadbeef',
                },
            },
        ],
        expectedErrors: [
            {
                description:
                    'Throws error if op_return_raw is invalid OP_RETURN',
                opReturnRaw: 'deadbeef',
                error: new Error('Invalid OP_RETURN'),
            },
        ],
    },
};
