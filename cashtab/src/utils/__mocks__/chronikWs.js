// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const activeWebsocketAlpha = {
    autoReconnect: true,
    manuallyClosed: false,
    subs: [
        {
            scriptType: 'p2pkh',
            scriptPayload: '1fb76a7db96fc774cbad00e8a72890602b4be304',
        },
        {
            scriptType: 'p2pkh',
            scriptPayload: 'a9f494266e4b3c823712f27dedcb83e30b2fe59f',
        },
        {
            scriptType: 'p2pkh',
            scriptPayload: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
        },
    ],
    wsUrl: 'wss://chronik.be.cash/xec/ws',
    ws: { readyState: 1 },
    connected: {},
};

export const disconnectedWebsocketAlpha = {
    autoReconnect: true,
    manuallyClosed: false,
    subs: [
        {
            scriptType: 'p2pkh',
            scriptPayload: '1fb76a7db96fc774cbad00e8a72890602b4be304',
        },
        {
            scriptType: 'p2pkh',
            scriptPayload: 'a9f494266e4b3c823712f27dedcb83e30b2fe59f',
        },
        {
            scriptType: 'p2pkh',
            scriptPayload: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
        },
    ],
    wsUrl: 'wss://chronik.be.cash/xec/ws',
    ws: { readyState: 3 },
    connected: {},
};

export const unsubscribedWebsocket = {
    autoReconnect: true,
    manuallyClosed: false,
    subs: [],
    wsUrl: 'wss://chronik.be.cash/xec/ws',
    ws: { readyState: 1 },
    connected: {},
};
