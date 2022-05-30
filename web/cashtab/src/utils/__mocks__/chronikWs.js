export const lambdaHash160s = [
    '58549b5b93428fac88e36617456cd99a411bd0eb',
    '438a162355ef683062a7fde9d08dd720397aaee8',
    '76458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
];

export const lambdaIncomingXecTx = {
    txid: 'ac83faac54059c89c41dea4c3d6704e4f74fb82e4ad2fb948e640f1d19b760de',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: '783428349b7b040b473ca9720ddbb2eda6fe28db16883ae47f3113b7a0977915',
                outIdx: 1,
            },
            inputScript:
                '48304502210094c497d6a0ce9ca6d79819467a1bb3953084b2e003ac7edac3b4f0634800baab02205729e229bd96d3a35cece712e3e9ec2d3f610a43d7712928f806983f209fbd72412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            value: '517521',
            sequenceNo: 4294967295,
        },
    ],
    outputs: [
        {
            value: '4200',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
        },
        {
            value: '512866',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
        },
    ],
    lockTime: 0,
    timeFirstSeen: '1652811898',
    network: 'XEC',
};

export const lambdaOutgoingXecTx = {
    txid: 'b82a67f929d256c9beb04a850ad735f3b322156cc9df2e37cadc130cc4fab660',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: 'bb161d20f884ce45374fa3f9f1452290a2e52e93c8b552f559fad8ccd1ca33cc',
                outIdx: 5,
            },
            inputScript:
                '473044022054a6b2065a0b0bbe70048e782aa9be048cc8bee0a241d08d0b98fcd74505a90202201ed5224f34c9ff73dc0c581390247686af521476a977a58e55ed33c4afd177c2412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            value: '4400000',
            sequenceNo: 4294967295,
        },
    ],
    outputs: [
        {
            value: '22200',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
        },
        {
            value: '4377345',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
        },
    ],
    lockTime: 0,
    timeFirstSeen: '1652823464',
    network: 'XEC',
};

export const lambdaIncomingEtokenTx = {
    txid: '46cf8bf009dbc6da45045c23af878cd2fd6dd3d3f62bf524d675e75959d5fdbd',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: '51c18b220c2ff1d3ead60c3031316f15ed1c7fa43fbfe563c8227e107f218751',
                outIdx: 1,
            },
            inputScript:
                '473044022004db23a179194d5e2d8446159859a3e55521239c807f14d4666c772d1493a7d402206d6ea22a4fb8ef20cd6159d200a7292a3ff0181c8d596e7a3e1b9027e6912103412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            value: '3891539',
            sequenceNo: 4294967295,
        },
        {
            prevOut: {
                txid: '66f0663e79f6a7fa3bf0834a16b48cb86fa42076c0df25ae89b402d5ee97c311',
                outIdx: 2,
            },
            inputScript:
                '483045022100c45951e15402b907c419f8a80bd76d374521faf885327ba3e55021345c2eb41902204cdb84e0190a5f671dd049b6b656f6b9e8b57254ec0123308345d5a634802acd412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            value: '546',
            sequenceNo: 4294967295,
            slpToken: {
                amount: '240',
                isMintBaton: false,
            },
        },
    ],
    outputs: [
        {
            value: '0',
            outputScript:
                '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000c0800000000000000e4',
        },
        {
            value: '546',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            slpToken: {
                amount: '12',
                isMintBaton: false,
            },
        },
        {
            value: '546',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            slpToken: {
                amount: '228',
                isMintBaton: false,
            },
        },
        {
            value: '3889721',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
        },
    ],
    lockTime: 0,
    slpTxData: {
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
        },
    },
    timeFirstSeen: '1652822000',
    network: 'XEC',
};

export const lambdaOutgoingEtokenTx = {
    txid: '3d60d2d130eee3e45e6a2d0e88e2ecae82d70c1ed1afc8f62ca9c8564d38108d',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: 'bf7a7d1a063751d8f9c67e88523b3e6ffe8bb133e54ebf3cf500b859adfe16e0',
                outIdx: 1,
            },
            inputScript:
                '473044022047077b516d8554aba4deb36c66b789b5136bf16657bf1675ae866fd8a62834f5022035a7bd45422e0d0c343ac832a5efb0c05269ebe591ea400a33c23849cfa7c3a0412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            value: '450747149',
            sequenceNo: 4294967295,
        },
        {
            prevOut: {
                txid: '66f0663e79f6a7fa3bf0834a16b48cb86fa42076c0df25ae89b402d5ee97c311',
                outIdx: 1,
            },
            inputScript:
                '47304402203ba0eff663f253805a4ae75fecf5886d7dbaf6369c9e6f0bbf5c114184223fa202207992c5f1a8cb69b552b1af54a75bbab341bfcf90591e535282bd9409981d8464412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            value: '546',
            sequenceNo: 4294967295,
            slpToken: {
                amount: '69',
                isMintBaton: false,
            },
        },
    ],
    outputs: [
        {
            value: '0',
            outputScript:
                '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3080000000000000011080000000000000034',
        },
        {
            value: '546',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            slpToken: {
                amount: '17',
                isMintBaton: false,
            },
        },
        {
            value: '546',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            slpToken: {
                amount: '52',
                isMintBaton: false,
            },
        },
        {
            value: '450745331',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
        },
    ],
    lockTime: 0,
    slpTxData: {
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
        },
    },
    timeFirstSeen: '1652823534',
    network: 'XEC',
};

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
