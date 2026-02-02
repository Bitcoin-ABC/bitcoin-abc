// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { opReturn } from 'config/opreturn';
import { Script, fromHex } from 'ecash-lib';

// Test vectors for opreturn output generating functions

export const opReturnVectors = {
    parseNFToaAuth: {
        expectedReturns: [
            {
                description: 'valid NFToa Authentication tx',
                tx: {
                    txid: 'nftoa-auth-example',
                    outputs: [
                        {
                            // 6a = OP_RETURN, then payload
                            outputScript:
                                '6a044e465400134c6f67696e20746f2047617564696f2041707008eb0c601b84975437',
                            sats: 0n,
                        },
                    ],
                },
                hashes: [],
                parsed: {
                    appActions: [
                        {
                            lokadId: '4e465400', // "NFT\0" in hex
                            app: 'NFToa',
                            isValid: true,
                            action: {
                                type: 'Authentication',
                                data: 'Login to Gaudio App',
                                nonce: 'eb0c601b84975437',
                            },
                        },
                    ],
                },
            },
        ],
        expectedErrors: [
            {
                description:
                    'NFToa tx missing message or nonce (invalid format)',
                tx: {
                    txid: 'nftoa-auth-invalid',
                    outputs: [
                        {
                            // hanya Lokad ID tanpa pushdata berikutnya
                            outputScript: '6a044e465400',
                            sats: 0n,
                        },
                    ],
                },
                hashes: [],
                msg: 'Invalid NFToa transaction format',
            },
            {
                description: 'NFToa tx missing nonce field',
                tx: {
                    txid: 'nftoa-auth-missing-nonce',
                    outputs: [
                        {
                            // tidak ada segmen nonce terakhir (08 <nonce>)
                            outputScript:
                                '6a044e465400134c6f67696e20746f2047617564696f20417070',
                            sats: 0n,
                        },
                    ],
                },
                hashes: [],
                msg: 'Invalid NFToa transaction format',
            },
        ],
    },
    cashtabMsgs: {
        expectedReturns: [
            {
                description: 'Alphanumeric string',
                cashtabMsg: 'This is a Cashtab Msg',
                returned: {
                    sats: 0n,
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
                    sats: 0n,
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
                    sats: 0n,
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
                    sats: 0n,
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
                    sats: 0n,
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
                    sats: 0n,
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
                    sats: 0n,
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
                    sats: 0n,
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
                    sats: 0n,
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
                    sats: 0n,
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
    parseFirma: {
        expectedReturns: [
            {
                description:
                    'Returns protocol identifier and decoded solana address for a valid SOL0 firma push',
                firma: '534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf745',
                returned: {
                    protocol: 'Solana Address',
                    data: '6JKwz43wDTgk5n8eNCJrtsnNtkDdKd1XUZAvB9WkiEQ4',
                },
            },
            {
                description:
                    'Returns protocol identifier and error warning for an invalid SOL0 firma push',
                firma: '534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf7',
                returned: {
                    protocol: 'Solana Address',
                    data: 'Invalid Solana address: raw pk 4ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf7',
                },
            },
            {
                description:
                    'Returns protocol identifier and decoded message for a valid Cashtab msg',
                firma: '007461626c6574277320676f6f6f6f6f6f6f206543617368203d20656c656374726f6e696320436173680a58e3858ce384b7757272656e6379',
                returned: {
                    protocol: 'Cashtab Msg',
                    data: `let's gooooooo eCash = electronic Cash\nXㅌㄷurrency`,
                },
            },
            {
                description:
                    'Returns unknown lokad firma push with unknown lokad',
                firma: 'deadbeef',
                returned: {
                    protocol: 'Unknown Lokad',
                    data: 'deadbeef',
                },
            },
            {
                description:
                    'Returns unknown lokad firma push that is too short for a lokadId',
                firma: 'beef',
                returned: {
                    protocol: 'Unknown Lokad',
                    data: 'beef',
                },
            },
        ],
    },
    getXecxAppAction: {
        expectedReturns: [
            {
                description: 'Gets XECX app action from valid EMPP XECX',
                push: {
                    remainingHex:
                        '0008c43400000000000e21fdc39e01000000000000000000000000',
                },
                returned: {
                    eligibleTokenSatoshis: 1781404606734,
                    excludedHoldersCount: 0,
                    ineligibleTokenSatoshis: 0,
                    minBalanceTokenSatoshisToReceivePaymentThisRound: 3458056,
                },
            },
            {
                description:
                    'Gets UnknownAction app action from invalid EMPP XECX (not version 0)',
                push: {
                    remainingHex:
                        '0108c43400000000000e21fdc39e01000000000000000000000000',
                },
                returned: {
                    decoded: Buffer.from(
                        '0108c43400000000000e21fdc39e01000000000000000000000000',
                        'hex',
                    ).toString('utf8'),
                    stack: '0108c43400000000000e21fdc39e01000000000000000000000000',
                },
            },
        ],
    },
    getEmppAppAction: {
        expectedReturns: [
            {
                description: 'Gets an XECX app action',
                push: '584543580008c43400000000000e21fdc39e01000000000000000000000000',
                returned: {
                    app: 'XECX',
                    isValid: true,
                    lokadId: '58454358',
                    action: {
                        eligibleTokenSatoshis: 1781404606734,
                        excludedHoldersCount: 0,
                        ineligibleTokenSatoshis: 0,
                        minBalanceTokenSatoshisToReceivePaymentThisRound: 3458056,
                    },
                },
            },
            {
                description:
                    'Gets an unknown app action for an invalid XECX action',
                push: '584543580108c43400000000000e21fdc39e01000000000000000000000000',
                returned: {
                    app: 'XECX',
                    isValid: false,
                    lokadId: '58454358',
                    action: {
                        decoded: Buffer.from(
                            '0108c43400000000000e21fdc39e01000000000000000000000000',
                            'hex',
                        ).toString('utf8'),
                        stack: '0108c43400000000000e21fdc39e01000000000000000000000000',
                    },
                },
            },
            {
                description: 'Parses arbitrary unknown empp action',
                push: 'deadbeef',
                returned: {
                    action: {
                        decoded: Buffer.from('deadbeef', 'hex').toString(
                            'utf8',
                        ),
                        stack: 'deadbeef',
                    },
                    app: 'unknown',
                    lokadId: 'deadbeef',
                },
            },
            {
                description: 'Parses valid Solana address',
                push: '534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf745',
                returned: {
                    action: {
                        solAddr: '6JKwz43wDTgk5n8eNCJrtsnNtkDdKd1XUZAvB9WkiEQ4',
                    },
                    app: 'Solana Address',
                    isValid: true,
                    lokadId: '534f4c30',
                },
            },
            {
                description: 'Parses invalid Solana address',
                push: '534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf7',
                returned: {
                    action: {
                        solAddr:
                            'Invalid SOL pk: 4ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf7',
                    },
                    app: 'Solana Address',
                    isValid: false,
                    lokadId: '534f4c30',
                },
            },
            {
                description: 'Returns undefined for ALP push',
                push: '534c5032000747454e455349530343524411437265646f20496e20556e756d2044656f1968747470733a2f2f6372642e6e6574776f726b2f746f6b656e00210334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10040001',
                returned: undefined,
            },
            {
                description: 'Returns undefined for Agora push',
                push: '41475230075041525449414c',
                returned: undefined,
            },
            {
                description: 'Parses valid PayButton with data and nonce',
                push: '50415900000568656c6c6f080000000000000001',
                returned: {
                    app: 'PayButton',
                    isValid: true,
                    lokadId: '50415900',
                    action: {
                        data: 'hello',
                        nonce: '0000000000000001',
                    },
                },
            },
            {
                description: 'Parses valid PayButton with empty data and nonce',
                push: '50415900000000',
                returned: {
                    app: 'PayButton',
                    isValid: true,
                    lokadId: '50415900',
                    action: {
                        data: '',
                        nonce: '',
                    },
                },
            },
            {
                description: 'Parses valid PayButton with data but empty nonce',
                push: '50415900000568656c6c6f00',
                returned: {
                    app: 'PayButton',
                    isValid: true,
                    lokadId: '50415900',
                    action: {
                        data: 'hello',
                        nonce: '',
                    },
                },
            },
            {
                description: 'Parses valid PayButton with empty data but nonce',
                push: '504159000000080000000000000001',
                returned: {
                    app: 'PayButton',
                    isValid: true,
                    lokadId: '50415900',
                    action: {
                        data: '',
                        nonce: '0000000000000001',
                    },
                },
            },
            {
                description:
                    'Parses invalid PayButton with unsupported version',
                push: '50415900010568656c6c6f00',
                returned: {
                    app: 'PayButton',
                    isValid: false,
                    lokadId: '50415900',
                    action: {
                        stack: '50415900010568656c6c6f00',
                        decoded: 'Unsupported PayButton version: 0x01',
                    },
                },
            },
            {
                description:
                    'Parses invalid PayButton with invalid data length',
                push: '50415900001068656c6c6f00',
                returned: {
                    app: 'PayButton',
                    isValid: false,
                    lokadId: '50415900',
                    action: {
                        stack: '50415900001068656c6c6f00',
                        decoded: 'Invalid PayButton data length',
                    },
                },
            },
            {
                description:
                    'Parses invalid PayButton with invalid nonce length',
                push: '50415900000568656c6c6f050000000000000001',
                returned: {
                    app: 'PayButton',
                    isValid: false,
                    lokadId: '50415900',
                    action: {
                        stack: '50415900000568656c6c6f050000000000000001',
                        decoded: 'Invalid PayButton nonce',
                    },
                },
            },
            {
                description:
                    'Parses invalid PayButton with insufficient bytes for nonce',
                push: '50415900000008',
                returned: {
                    app: 'PayButton',
                    isValid: false,
                    lokadId: '50415900',
                    action: {
                        stack: '50415900000008',
                        decoded: 'Invalid PayButton nonce',
                    },
                },
            },
        ],
    },
    getEmppAppActions: {
        expectedReturns: [
            {
                description: 'Gets valid XECX action if only action',
                stackArray: [
                    '50',
                    '584543580008c43400000000000e21fdc39e01000000000000000000000000',
                ],
                returned: [
                    {
                        app: 'XECX',
                        isValid: true,
                        lokadId: '58454358',
                        action: {
                            eligibleTokenSatoshis: 1781404606734,
                            excludedHoldersCount: 0,
                            ineligibleTokenSatoshis: 0,
                            minBalanceTokenSatoshisToReceivePaymentThisRound: 3458056,
                        },
                    },
                ],
            },

            {
                description: 'Gets empty array for ALP action if only action',
                stackArray: [
                    '50',
                    '534c5032000747454e455349530343524411437265646f20496e20556e756d2044656f1968747470733a2f2f6372642e6e6574776f726b2f746f6b656e00210334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10040001',
                ],
                returned: [],
            },
            {
                description:
                    'Returns valid XECX, invalid XECX, d nothing for ALP, and arbitrary unknown, given these 4 EMPP pushes',
                stackArray: [
                    '50',
                    '584543580008c43400000000000e21fdc39e01000000000000000000000000',
                    '584543580108c43400000000000e21fdc39e01000000000000000000000000',
                    '534c5032000747454e455349530343524411437265646f20496e20556e756d2044656f1968747470733a2f2f6372642e6e6574776f726b2f746f6b656e00210334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10040001',
                    'deadbeef',
                ],
                returned: [
                    {
                        app: 'XECX',
                        isValid: true,
                        lokadId: '58454358',
                        action: {
                            eligibleTokenSatoshis: 1781404606734,
                            excludedHoldersCount: 0,
                            ineligibleTokenSatoshis: 0,
                            minBalanceTokenSatoshisToReceivePaymentThisRound: 3458056,
                        },
                    },
                    {
                        app: 'XECX',
                        isValid: false,
                        lokadId: '58454358',
                        action: {
                            decoded: Buffer.from(
                                '0108c43400000000000e21fdc39e01000000000000000000000000',
                                'hex',
                            ).toString('utf8'),
                            stack: '0108c43400000000000e21fdc39e01000000000000000000000000',
                        },
                    },
                    {
                        app: 'unknown',
                        lokadId: 'deadbeef',
                        action: {
                            decoded: Buffer.from('deadbeef', 'hex').toString(
                                'utf8',
                            ),
                            stack: 'deadbeef',
                        },
                    },
                ],
            },
        ],
        expectedErrors: [
            {
                description: 'Throws if called with an invalid stackArray',
                stackArray: { stackArray: ['50'] },
                error: 'stackArray must be an array of OP_RETURN pushes with first entry OP_RESERVED',
            },
            {
                description: 'Throws if called with non-EMPP stackArray',
                stackArray: ['04'],
                error: 'Not an EMPP stackArray',
            },
        ],
    },
    parseEmppRaw: {
        expectedReturns: [
            {
                description: 'Parses valid Cashtab Msg',
                emppRaw: '0074616274657374206d657373616765',
                returned: {
                    protocol: 'Cashtab Msg',
                    data: 'test message',
                },
            },
            {
                description: 'Parses valid Cashtab Msg with empty message',
                emppRaw: '00746162',
                returned: {
                    protocol: 'Invalid Cashtab Msg',
                    data: '00746162',
                },
            },
            {
                description: 'Parses valid Firma Withdrawal',
                emppRaw:
                    '534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf745',
                returned: {
                    protocol: 'Firma Withdrawal',
                    data: '6JKwz43wDTgk5n8eNCJrtsnNtkDdKd1XUZAvB9WkiEQ4',
                },
            },
            {
                description: 'Parses invalid Firma Withdrawal (wrong length)',
                emppRaw:
                    '534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf7',
                returned: {
                    protocol: 'Invalid Firma Withdrawal',
                    data: '534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf7',
                },
            },
            {
                description: 'Parses valid PayButton with data and nonce',
                emppRaw: '50415900000568656c6c6f080000000000000001',
                returned: {
                    protocol: 'PayButton',
                    data: 'Data: hello, Nonce: 0000000000000001',
                },
            },
            {
                description: 'Parses valid PayButton with empty data and nonce',
                emppRaw: '50415900000000',
                returned: {
                    protocol: 'PayButton',
                    data: '',
                },
            },
            {
                description: 'Parses valid PayButton with data but empty nonce',
                emppRaw: '50415900000568656c6c6f00',
                returned: {
                    protocol: 'PayButton',
                    data: 'Data: hello',
                },
            },
            {
                description: 'Parses valid PayButton with empty data but nonce',
                emppRaw: '504159000000080000000000000001',
                returned: {
                    protocol: 'PayButton',
                    data: 'Nonce: 0000000000000001',
                },
            },
            {
                description:
                    'Parses invalid PayButton with unsupported version',
                emppRaw: '50415900010568656c6c6f00',
                returned: {
                    protocol: 'Invalid PayButton',
                    data: '50415900010568656c6c6f00',
                },
            },
            {
                description:
                    'Parses invalid PayButton with invalid data length',
                emppRaw: '50415900001068656c6c6f00',
                returned: {
                    protocol: 'Invalid PayButton',
                    data: '50415900001068656c6c6f00',
                },
            },
            {
                description: 'Returns Unknown Protocol for invalid hex',
                emppRaw: 'invalid',
                returned: {
                    protocol: 'Unknown Protocol',
                    data: 'invalid',
                },
            },
            {
                description: 'Returns Unknown Protocol for empty string',
                emppRaw: '',
                returned: {
                    protocol: 'Unknown Protocol',
                    data: '',
                },
            },
            {
                description: 'Returns Unknown Protocol for odd length hex',
                emppRaw: 'deadbeef1',
                returned: {
                    protocol: 'Unknown Protocol',
                    data: 'deadbeef1',
                },
            },
            {
                description: 'Returns Unknown Protocol for unknown lokad',
                emppRaw: 'deadbeef',
                returned: {
                    protocol: 'Unknown Protocol',
                    data: 'deadbeef',
                },
            },
            {
                description:
                    'Returns Unknown Protocol for ALP push (not parsed)',
                emppRaw:
                    '534c5032000747454e455349530343524411437265646f20496e20556e756d2044656f1968747470733a2f2f6372642e6e6574776f726b2f746f6b656e00210334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10040001',
                returned: {
                    protocol: 'Unknown Protocol',
                    data: '534c5032000747454e455349530343524411437265646f20496e20556e756d2044656f1968747470733a2f2f6372642e6e6574776f726b2f746f6b656e00210334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10040001',
                },
            },
            {
                description:
                    'Returns Unknown Protocol for Agora push (not parsed)',
                emppRaw: '41475230075041525449414c',
                returned: {
                    protocol: 'Unknown Protocol',
                    data: '41475230075041525449414c',
                },
            },
            {
                description:
                    'Handles parsing error gracefully (insufficient bytes)',
                emppRaw: '0074',
                returned: {
                    protocol: 'Unknown Protocol',
                    data: '0074',
                },
            },
        ],
    },
};
