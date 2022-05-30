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
