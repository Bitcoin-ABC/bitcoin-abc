// Copyright (c) 2023 The Bitcoin developers
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
};
