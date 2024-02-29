// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { opReturn } from 'config/opreturn';

// Test vectors for opreturn output generating functions

export const opReturnVectors = {
    cashtabMsgs: {
        expectedReturns: [
            {
                description: 'Alphanumeric string',
                cashtabMsg: 'This is a Cashtab Msg',
                outputScriptHex:
                    '6a0400746162155468697320697320612043617368746162204d7367',
            },
            {
                description: 'String with emojis',
                cashtabMsg: '🙏📬🫡👀🕵️👑🎃🪖🐋🎯',
                outputScriptHex:
                    '6a04007461622bf09f998ff09f93acf09faba1f09f9180f09f95b5efb88ff09f9191f09f8e83f09faa96f09f908bf09f8eaf',
            },
            {
                description: 'String of max length for Cashtab Msg',
                cashtabMsg:
                    '00000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000112345',
                outputScriptHex:
                    '6a04007461624cd73030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313132333435',
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
                outputScriptHex:
                    '6a0464726f702050d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
            },
            {
                description:
                    'Airdrop with many spaces for optional msg treated as no optional msg',
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                airdropMsg: '          ',
                outputScriptHex:
                    '6a0464726f702050d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
            },
            {
                description: 'Airdrop with optional alphanumeric msg',
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                airdropMsg: 'Test airdrop msg',
                outputScriptHex:
                    '6a0464726f702050d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e10546573742061697264726f70206d7367',
            },
            {
                description:
                    'Airdrop with optional emoji and special characters msg',
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                airdropMsg:
                    '30~40 프로 상승으로 만족못하겠으니 300~400프로 펌핑 함 가즈아~ 시체밭넘고~🤔',
                outputScriptHex:
                    '6a0464726f702050d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e4c6833307e343020ed9484eba19c20ec8381ec8ab9ec9cbceba19c20eba78ceca1b1ebaabbed9598eab2a0ec9cbceb8b88203330307e343030ed9484eba19c20ed8e8ced959120ed95a820eab080eca688ec95847e20ec8b9cecb2b4ebb0adeb8498eab3a07ef09fa494',
            },
            {
                description:
                    'Airdrop with optional msg of max allowable length',
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                airdropMsg:
                    '00000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000112',
                outputScriptHex:
                    '6a0464726f702050d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e4cb63030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313132',
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
    aliasRegistrations: {
        expectedReturns: [
            {
                description: 'Valid alias to p2pkh address',
                alias: 'test',
                address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                outputScriptHex:
                    '6a042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
            },
            {
                description: 'Valid alias to p2sh address',
                alias: 'testtwo',
                address: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                outputScriptHex:
                    '6a042e78656300077465737474776f1508d37c4c809fe9840e7bfa77b86bd47163f6fb6c60',
            },
        ],
        expectedErrors: [
            {
                description: 'Invalid alias',
                alias: 'test_WITH_badchars',
                address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                errorMsg:
                    'Invalid alias "test_WITH_badchars": Alias may only contain lowercase characters a-z and 0-9',
            },
            {
                description: 'Invalid address',
                alias: 'test',
                address: 'not an address',
                errorMsg: 'Invalid address "not an address"',
            },
        ],
    },
    aliasByteCounts: {
        expectedReturns: [
            { description: 'Alias with emoji', alias: '🙈', byteCount: 4 },
            {
                description: 'Alias with emoji and text',
                alias: 'monkey🙈',
                byteCount: 10,
            },
            {
                description: 'Alias with special characters',
                alias: 'monkey©®ʕ•́ᴥ•̀ʔっ♡',
                byteCount: 33,
            },
            {
                description: 'Alias with Korean text',
                alias: '소주',
                byteCount: 6,
            },
            {
                description: 'Alias with Arabic text',
                alias: 'محيط',
                byteCount: 8,
            },
            {
                description: 'Alias with Chinese text',
                alias: '冰淇淋',
                byteCount: 9,
            },
            {
                description: 'Alias with mixed foreign alphabets and emoji',
                alias: '🙈©冰소주',
                byteCount: 15,
            },
            {
                description: 'Alphanumeric valid v0 alias',
                alias: 'justanormalalias',
                byteCount: 16,
            },
        ],
        expectedErrors: [
            {
                description: 'non-text input',
                alias: null,
                errorMsg: 'alias input must be a string',
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
                outputScriptHex:
                    '6a0400746162155468697320697320612043617368746162204d7367',
            },
            {
                description: 'Max length for opreturn param',
                opreturnParam:
                    '04007461624cd73030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313132333435',
                outputScriptHex:
                    '6a04007461624cd73030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313132333435',
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
};
