export const activeWebsocketAlpha = {
    autoReconnect: true,
    _manuallyClosed: false,
    _subs: [
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
    _wsUrl: 'wss://chronik.be.cash/xec/ws',
    _ws: { readyState: 1 },
    _connected: {},
};

export const disconnectedWebsocketAlpha = {
    autoReconnect: true,
    _manuallyClosed: false,
    _subs: [
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
    _wsUrl: 'wss://chronik.be.cash/xec/ws',
    _ws: { readyState: 3 },
    _connected: {},
};

export const unsubscribedWebsocket = {
    autoReconnect: true,
    _manuallyClosed: false,
    _subs: [],
    _wsUrl: 'wss://chronik.be.cash/xec/ws',
    _ws: { readyState: 1 },
    _connected: {},
};
