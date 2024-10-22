// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

/**
 * Create a map of lokad IDs to app name used for daily summaries and, soon, tweets
 * Ultimately this should replace the knownApps in constants/op_return.js
 * However the parsing needs are distinct for daily summary vs block msgs
 */
const lokadMap = new Map();

lokadMap.set('64726f70', { name: 'Airdrop', emoji: '🪂' });
lokadMap.set('00746162', { name: 'Cashtab Msg', emoji: '✏️' });
lokadMap.set('61757468', { name: 'eCashChat Auth', emoji: '🔓' });
lokadMap.set('46555a00', { name: 'CashFusion', emoji: '⚛️' });
lokadMap.set('50415900', { name: 'PayButton tx', emoji: '🛒' });
lokadMap.set('70617977', { name: 'Paywall tx', emoji: '💸' });
lokadMap.set('63686174', {
    name: 'eCashChat tx',
    emoji: '💬',
    url: 'https://www.ecashchat.com/',
});
lokadMap.set('626c6f67', {
    name: 'Article/Reply tx',
    emoji: '🖋',
    url: 'https://www.ecashchat.com/',
});

module.exports = lokadMap;
