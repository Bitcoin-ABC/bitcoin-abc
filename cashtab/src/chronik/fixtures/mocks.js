export const mockFilteredSortedAliasTxHistoryWithDuplicateTxs = [
    {
        txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1cc67f99c0da539449a9bb9f2ded3340d8de169115e8484562c8492159ad59d6',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ad8dc3a6eaefbcdcceca15474c826e7454759f3f55c12af30e8b4ccdd66fe13f02204bbd62e3865499366f22063c34b471148679f82a88f3d4b66bd1395eccf2997941210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'd826198de42c449731961fd4ba81b3d8b36a49ab85cd6bb846adf9bd8f460a90',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221009a585d7a20e87f0b7a123c3674fabd6fd2907d50b6a0adfef705a62466b5737502202b540834f20b70c26f56df096044780254b14d5b4c7ed44e3e172c934a3b38d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '78689',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a040074616205657468616e',
            },
            {
                value: '55400',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                spentBy: {
                    txid: 'fd4ce09c3d527922870b5b22ee844edd0d3aadfcc86fac189afdf266fc9fa757',
                    outIdx: 0,
                },
            },
            {
                value: '23087',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770450,
            hash: '00000000000000000fe787306e26f0f28f7d1b46c4888890fc84537dde647f1c',
            timestamp: '1671107720',
        },
        timeFirstSeen: '1671107230',
        size: 395,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'fe9ae60ad1d947dfe041499b8f56b902779374fb2fb6662f91d5683c4c3ddb8b',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100fad2532abe7c1e2b57ebdbee0a43c4176f6f3389c27b178cb6b27a89fc607a2b02200276ab355eb99f0a6943e4551b2010ddf97b2afe25774b061140d62cd38b42d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100a245067515681caacf1d6da90a8cc4964f0e6282e32325149a6ae7e5c6ae70ed02204bb213450b3f7bbf0a38ba045936157481261e8709c464f092e925ac4a1ee33f41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '23087',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e786563036e6673',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '22329',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 100000000,
        },
        size: 398,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockUnfilteredSortedAliasTxHistoryWithDuplicateTxs = [
    {
        txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1cc67f99c0da539449a9bb9f2ded3340d8de169115e8484562c8492159ad59d6',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ad8dc3a6eaefbcdcceca15474c826e7454759f3f55c12af30e8b4ccdd66fe13f02204bbd62e3865499366f22063c34b471148679f82a88f3d4b66bd1395eccf2997941210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'd826198de42c449731961fd4ba81b3d8b36a49ab85cd6bb846adf9bd8f460a90',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221009a585d7a20e87f0b7a123c3674fabd6fd2907d50b6a0adfef705a62466b5737502202b540834f20b70c26f56df096044780254b14d5b4c7ed44e3e172c934a3b38d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '78689',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a040074616205657468616e',
            },
            {
                value: '55400',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                spentBy: {
                    txid: 'fd4ce09c3d527922870b5b22ee844edd0d3aadfcc86fac189afdf266fc9fa757',
                    outIdx: 0,
                },
            },
            {
                value: '23087',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770450,
            hash: '00000000000000000fe787306e26f0f28f7d1b46c4888890fc84537dde647f1c',
            timestamp: '1671107720',
        },
        timeFirstSeen: '1671107230',
        size: 395,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c1dce1385c8185c5a058b3679966a1b68f7f8e0c74ac3c03c11870e8dfe4ce3d022016f3574a846b12ffc440528263a0139d170527dd2efdb46ae643dd30b3da969741210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '22329',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a040074616205657468616e',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '21318',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770450,
            hash: '0000000000000000110940de16f07da16b7a5441694d2a5ace3e8faa7e04fc4e',
            timestamp: '1671109291',
        },
        timeFirstSeen: '1671108616',
        size: 250,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'fe9ae60ad1d947dfe041499b8f56b902779374fb2fb6662f91d5683c4c3ddb8b',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100fad2532abe7c1e2b57ebdbee0a43c4176f6f3389c27b178cb6b27a89fc607a2b02200276ab355eb99f0a6943e4551b2010ddf97b2afe25774b061140d62cd38b42d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100a245067515681caacf1d6da90a8cc4964f0e6282e32325149a6ae7e5c6ae70ed02204bb213450b3f7bbf0a38ba045936157481261e8709c464f092e925ac4a1ee33f41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '23087',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e786563036e6673',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '22329',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 100000000,
        },
        size: 398,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockSortedAliasTxHistoryWithTxsInSameBlock = [
    {
        txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1cc67f99c0da539449a9bb9f2ded3340d8de169115e8484562c8492159ad59d6',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ad8dc3a6eaefbcdcceca15474c826e7454759f3f55c12af30e8b4ccdd66fe13f02204bbd62e3865499366f22063c34b471148679f82a88f3d4b66bd1395eccf2997941210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'd826198de42c449731961fd4ba81b3d8b36a49ab85cd6bb846adf9bd8f460a90',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221009a585d7a20e87f0b7a123c3674fabd6fd2907d50b6a0adfef705a62466b5737502202b540834f20b70c26f56df096044780254b14d5b4c7ed44e3e172c934a3b38d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '78689',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a040074616205657468616e',
            },
            {
                value: '55400',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                spentBy: {
                    txid: 'fd4ce09c3d527922870b5b22ee844edd0d3aadfcc86fac189afdf266fc9fa757',
                    outIdx: 0,
                },
            },
            {
                value: '23087',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770450,
            hash: '00000000000000000fe787306e26f0f28f7d1b46c4888890fc84537dde647f1c',
            timestamp: '1671107720',
        },
        timeFirstSeen: '1671107230',
        size: 395,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c1dce1385c8185c5a058b3679966a1b68f7f8e0c74ac3c03c11870e8dfe4ce3d022016f3574a846b12ffc440528263a0139d170527dd2efdb46ae643dd30b3da969741210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '22329',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e78656303666f6f',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '21318',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770450,
            hash: '0000000000000000110940de16f07da16b7a5441694d2a5ace3e8faa7e04fc4e',
            timestamp: '1671109291',
        },
        timeFirstSeen: '1671108616',
        size: 250,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'fe9ae60ad1d947dfe041499b8f56b902779374fb2fb6662f91d5683c4c3ddb8b',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100fad2532abe7c1e2b57ebdbee0a43c4176f6f3389c27b178cb6b27a89fc607a2b02200276ab355eb99f0a6943e4551b2010ddf97b2afe25774b061140d62cd38b42d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100a245067515681caacf1d6da90a8cc4964f0e6282e32325149a6ae7e5c6ae70ed02204bb213450b3f7bbf0a38ba045936157481261e8709c464f092e925ac4a1ee33f41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '23087',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e786563036e6673',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '22329',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 100000000,
        },
        size: 398,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockUnsortedAliasTxHistoryWithTxsInSameBlock = [
    {
        txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1cc67f99c0da539449a9bb9f2ded3340d8de169115e8484562c8492159ad59d6',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ad8dc3a6eaefbcdcceca15474c826e7454759f3f55c12af30e8b4ccdd66fe13f02204bbd62e3865499366f22063c34b471148679f82a88f3d4b66bd1395eccf2997941210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'd826198de42c449731961fd4ba81b3d8b36a49ab85cd6bb846adf9bd8f460a90',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221009a585d7a20e87f0b7a123c3674fabd6fd2907d50b6a0adfef705a62466b5737502202b540834f20b70c26f56df096044780254b14d5b4c7ed44e3e172c934a3b38d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '78689',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a040074616205657468616e',
            },
            {
                value: '55400',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                spentBy: {
                    txid: 'fd4ce09c3d527922870b5b22ee844edd0d3aadfcc86fac189afdf266fc9fa757',
                    outIdx: 0,
                },
            },
            {
                value: '23087',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770450,
            hash: '00000000000000000fe787306e26f0f28f7d1b46c4888890fc84537dde647f1c',
            timestamp: '1671107720',
        },
        timeFirstSeen: '1671107230',
        size: 395,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'fe9ae60ad1d947dfe041499b8f56b902779374fb2fb6662f91d5683c4c3ddb8b',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100fad2532abe7c1e2b57ebdbee0a43c4176f6f3389c27b178cb6b27a89fc607a2b02200276ab355eb99f0a6943e4551b2010ddf97b2afe25774b061140d62cd38b42d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100a245067515681caacf1d6da90a8cc4964f0e6282e32325149a6ae7e5c6ae70ed02204bb213450b3f7bbf0a38ba045936157481261e8709c464f092e925ac4a1ee33f41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '23087',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e786563036e6673',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '22329',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        size: 398,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c1dce1385c8185c5a058b3679966a1b68f7f8e0c74ac3c03c11870e8dfe4ce3d022016f3574a846b12ffc440528263a0139d170527dd2efdb46ae643dd30b3da969741210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '22329',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e78656303666f6f',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '21318',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770450,
            hash: '0000000000000000110940de16f07da16b7a5441694d2a5ace3e8faa7e04fc4e',
            timestamp: '1671109291',
        },
        timeFirstSeen: '1671108616',
        size: 250,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockSortedAliasTxHistoryWithUnconfirmedTxs = [
    {
        txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1cc67f99c0da539449a9bb9f2ded3340d8de169115e8484562c8492159ad59d6',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ad8dc3a6eaefbcdcceca15474c826e7454759f3f55c12af30e8b4ccdd66fe13f02204bbd62e3865499366f22063c34b471148679f82a88f3d4b66bd1395eccf2997941210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'd826198de42c449731961fd4ba81b3d8b36a49ab85cd6bb846adf9bd8f460a90',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221009a585d7a20e87f0b7a123c3674fabd6fd2907d50b6a0adfef705a62466b5737502202b540834f20b70c26f56df096044780254b14d5b4c7ed44e3e172c934a3b38d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '78689',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a040074616205657468616e',
            },
            {
                value: '55400',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                spentBy: {
                    txid: 'fd4ce09c3d527922870b5b22ee844edd0d3aadfcc86fac189afdf266fc9fa757',
                    outIdx: 0,
                },
            },
            {
                value: '23087',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770450,
            hash: '00000000000000000fe787306e26f0f28f7d1b46c4888890fc84537dde647f1c',
            timestamp: '1671107720',
        },
        timeFirstSeen: '1671107230',
        size: 395,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c1dce1385c8185c5a058b3679966a1b68f7f8e0c74ac3c03c11870e8dfe4ce3d022016f3574a846b12ffc440528263a0139d170527dd2efdb46ae643dd30b3da969741210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '22329',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e78656303666f6f',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '21318',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770452,
            hash: '0000000000000000110940de16f07da16b7a5441694d2a5ace3e8faa7e04fc4e',
            timestamp: '1671109291',
        },
        timeFirstSeen: '1671108616',
        size: 250,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'fe9ae60ad1d947dfe041499b8f56b902779374fb2fb6662f91d5683c4c3ddb8b',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100fad2532abe7c1e2b57ebdbee0a43c4176f6f3389c27b178cb6b27a89fc607a2b02200276ab355eb99f0a6943e4551b2010ddf97b2afe25774b061140d62cd38b42d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100a245067515681caacf1d6da90a8cc4964f0e6282e32325149a6ae7e5c6ae70ed02204bb213450b3f7bbf0a38ba045936157481261e8709c464f092e925ac4a1ee33f41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '23087',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e786563036e6673',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '22329',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 100000000,
        },
        size: 398,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockUnsortedAliasTxHistoryWithUnconfirmedTxs = [
    {
        txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1cc67f99c0da539449a9bb9f2ded3340d8de169115e8484562c8492159ad59d6',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ad8dc3a6eaefbcdcceca15474c826e7454759f3f55c12af30e8b4ccdd66fe13f02204bbd62e3865499366f22063c34b471148679f82a88f3d4b66bd1395eccf2997941210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'd826198de42c449731961fd4ba81b3d8b36a49ab85cd6bb846adf9bd8f460a90',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221009a585d7a20e87f0b7a123c3674fabd6fd2907d50b6a0adfef705a62466b5737502202b540834f20b70c26f56df096044780254b14d5b4c7ed44e3e172c934a3b38d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '78689',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a040074616205657468616e',
            },
            {
                value: '55400',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                spentBy: {
                    txid: 'fd4ce09c3d527922870b5b22ee844edd0d3aadfcc86fac189afdf266fc9fa757',
                    outIdx: 0,
                },
            },
            {
                value: '23087',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770450,
            hash: '00000000000000000fe787306e26f0f28f7d1b46c4888890fc84537dde647f1c',
            timestamp: '1671107720',
        },
        timeFirstSeen: '1671107230',
        size: 395,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'fe9ae60ad1d947dfe041499b8f56b902779374fb2fb6662f91d5683c4c3ddb8b',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100fad2532abe7c1e2b57ebdbee0a43c4176f6f3389c27b178cb6b27a89fc607a2b02200276ab355eb99f0a6943e4551b2010ddf97b2afe25774b061140d62cd38b42d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100a245067515681caacf1d6da90a8cc4964f0e6282e32325149a6ae7e5c6ae70ed02204bb213450b3f7bbf0a38ba045936157481261e8709c464f092e925ac4a1ee33f41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '23087',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e786563036e6673',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '22329',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        size: 398,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c1dce1385c8185c5a058b3679966a1b68f7f8e0c74ac3c03c11870e8dfe4ce3d022016f3574a846b12ffc440528263a0139d170527dd2efdb46ae643dd30b3da969741210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '22329',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e78656303666f6f',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '21318',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770452,
            hash: '0000000000000000110940de16f07da16b7a5441694d2a5ace3e8faa7e04fc4e',
            timestamp: '1671109291',
        },
        timeFirstSeen: '1671108616',
        size: 250,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockTxHistoryLastPageResponse25Txs = {
    txs: [
        {
            txid: 'ef62d52405287e9599050a731652be5f5c074372d97dcd839752bf1b2c6d36d4',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '83587921692f5dfa057e3a70d2f8678fb412486433ae9c127e8420c2fa24f85e',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100877a85643a4c486fcdbac5d398a232d0deb61a4f0339a6d5c170bf9f5f6244360220730f2a2fd972702b8b32ce6dc31193a50a979b869eb89cacffd0086dab7283854121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '92872',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e78656303313233',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '91861',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '7edd06e2f2d753598c1654e392702fac5c8a3c58943148eb12086379f63d1296',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771148,
                hash: '00000000000000000620fecc8b57fcd303bb3a0983446d57dcce2de4d82e54b2',
                timestamp: '1671545851',
            },
            timeFirstSeen: '1671544702',
            size: 245,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: 'ef62d52405287e9599050a731652be5f5c074372d97dcd839752bf1b2c6d36d4',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '83587921692f5dfa057e3a70d2f8678fb412486433ae9c127e8420c2fa24f85e',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100877a85643a4c486fcdbac5d398a232d0deb61a4f0339a6d5c170bf9f5f6244360220730f2a2fd972702b8b32ce6dc31193a50a979b869eb89cacffd0086dab7283854121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '92872',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e78656303313233',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '91861',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '7edd06e2f2d753598c1654e392702fac5c8a3c58943148eb12086379f63d1296',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771148,
                hash: '00000000000000000620fecc8b57fcd303bb3a0983446d57dcce2de4d82e54b2',
                timestamp: '1671545851',
            },
            timeFirstSeen: '1671544702',
            size: 245,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: 'ef62d52405287e9599050a731652be5f5c074372d97dcd839752bf1b2c6d36d4',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '83587921692f5dfa057e3a70d2f8678fb412486433ae9c127e8420c2fa24f85e',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100877a85643a4c486fcdbac5d398a232d0deb61a4f0339a6d5c170bf9f5f6244360220730f2a2fd972702b8b32ce6dc31193a50a979b869eb89cacffd0086dab7283854121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '92872',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e78656303313233',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '91861',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '7edd06e2f2d753598c1654e392702fac5c8a3c58943148eb12086379f63d1296',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771148,
                hash: '00000000000000000620fecc8b57fcd303bb3a0983446d57dcce2de4d82e54b2',
                timestamp: '1671545851',
            },
            timeFirstSeen: '1671544702',
            size: 245,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '3a437f5550aeee740da958bff262c1750054d8553eeb1a4600ef3ff9b8bdeab6',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c33d1533587fa1f187e1d41b3e392e1a9ffe93c388ebd2a3d169fe6fe839291a',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220383d869e50ec7cbc6d6764b49d4d46637c0ebace244c25ce24f41da1fe5224710220047c08f11dcb53d7f7420147d4518dfd9f14cdf9befa5c5237e07098de8c1ea54121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '168827',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e78656303666f6f',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '167816',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: 'f720c61be27eebc4bab010f05e47c90e2223464b246a1f9b8a20075c7236de81',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771148,
                hash: '00000000000000000620fecc8b57fcd303bb3a0983446d57dcce2de4d82e54b2',
                timestamp: '1671545851',
            },
            timeFirstSeen: '1671544586',
            size: 244,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '83587921692f5dfa057e3a70d2f8678fb412486433ae9c127e8420c2fa24f85e',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '8b263bf76bacc1d55a8b573f1710d737254c01726514f2d19fb82fe1500fad12',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100addb7863063668d4dfdf0fa0df187474ecdc61d88d4da683a747e2b2a5ed11e802205381330fb55c48724ace90ee3f94e6b138080092305e42d2c309f7513b4dd0d04121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '93883',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e78656303666f6f',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '92872',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: 'ef62d52405287e9599050a731652be5f5c074372d97dcd839752bf1b2c6d36d4',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771147,
                hash: '00000000000000000f81b23a2483ca41bc2045933f7a710b78a5a43a856ed821',
                timestamp: '1671544545',
            },
            timeFirstSeen: '1671544499',
            size: 245,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '28c2d5bcef414d76edb39ebac09c967d085210b043066c609f9c515042c74c42',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '2f90d5288a1f6b9c612552737493f2a889c1abf40b55e9d42b57ef7bf2e37dae',
                        outIdx: 1,
                    },
                    inputScript:
                        '4730440220233cf424733707094439cd45706e05cc70d5924df09a6b81bf43016a8105485902204e9a5cd6b33b546ce49b970761501005dbf5a80a0c24e29f71b66ca326cf2eb64121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '600',
                    sequenceNo: 4294967295,
                },
                {
                    prevOut: {
                        txid: '659729f14200d99f28da595f7bbf8f1b4a961ce8b9b34118791330f6592a1caf',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100c723c49a813cd0ff1b7eec2fe5ee8fbf5084ede64f245fe10d219d32a5efdefb022068c1998c9af655b2b2cea90068d33fa8093c07c46ce08f88b95fdd9cc72083514121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '630',
                    sequenceNo: 4294967295,
                },
                {
                    prevOut: {
                        txid: 'a7ff94066153ccb355913fc2ff81e9de547e598aa8019e0269388d14a5ec2e78',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100be1d946fe6b3f3e41273059522d3208e0059b3e73b8a2bd89c4a64e4c1e06cb8022010cbd2db787ca2f036766973ed821da4f8a3a791e42e50ffda0484b913e628b14121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '640',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e78656303666f6f',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
            ],
            lockTime: 0,
            block: {
                height: 771136,
                hash: '000000000000000012dc049c175b19302e29eb7a1cd3f309bb0430cd5190d348',
                timestamp: '1671538537',
            },
            timeFirstSeen: '1671538038',
            size: 506,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: 'ee3209c3e7493cfdad6398a92aef70feb7f7feaf8e7c91903ca27b2edbab98a8',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '1ad4a6b08a536a86cb10aa6816f866c4f5675d53d405e1ccb9777992af295239',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100878ebe9c648f7efa0eca660e2f3348b97b7570ca59351a80e9e6732fc6d080fd022027defc7b866bb01bb2a1c198eac1cca1de3d5263556e74e1741919d6f14107fa4121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '97023',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e786563046a6f6579',
                },
                {
                    value: '555',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '96013',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: 'e8ba20bbf01f59c66bd5ebc1f29ec41c9607a72c48bcb5a4cf972f423186103a',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771112,
                hash: '00000000000000000478e70d295fc1532fce78f79f2e1dde96073d6bcb09697d',
                timestamp: '1671523265',
            },
            timeFirstSeen: '1671522778',
            size: 246,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '446c1c3d979deed2b81258d907343c09091bc349352005d3a5804c97c611d19b',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '45c838577b52d532c46caa743a0a46edd4876b6f8e9d0d58ca094b9d70afade3',
                        outIdx: 248,
                    },
                    inputScript:
                        '473044022006ee5e5064d9eaef4c56e4a9b578d4a2dff87fae58624ccb6e34d547a3f607f90220674cbd244370f110fc88b49ac983b300c2f1cba3523332dff3486daa49d1efc94121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '179533',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e786563036e6673',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '178522',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '20182fb85164e7c0724cb42455ee2758e4c996ee613690d03eb96ba0ab2aebd2',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771103,
                hash: '00000000000000000f36aead0613a57660de0a9ca5d587b64b5954e27622c469',
                timestamp: '1671519222',
            },
            timeFirstSeen: '1671518864',
            size: 244,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '78a2fec2c41e272ab6e332623b42de67bce3618a53e3df9ba86de55644d87f0e',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '18130ccb9d0ee0616caabdab70d0e6217f8b7f42df8fd0a0a97a19523ab96b76',
                        outIdx: 2,
                    },
                    inputScript:
                        '473044022014aeb88c9baa07c5ce64030e2039767498ee561c2b07d26936e6798cdd484c08022052406b391c97ddf08359e54d2cb337e2eb01a9fae537cc8f3c54f7c4458e36774121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '99389',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e786563036e6673',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '98378',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '1ad4a6b08a536a86cb10aa6816f866c4f5675d53d405e1ccb9777992af295239',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771103,
                hash: '00000000000000000f36aead0613a57660de0a9ca5d587b64b5954e27622c469',
                timestamp: '1671519222',
            },
            timeFirstSeen: '1671518736',
            size: 244,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '18130ccb9d0ee0616caabdab70d0e6217f8b7f42df8fd0a0a97a19523ab96b76',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '6e353d5ba836a966a3ebc4f38ac36c852f79cdf1292f9fdaac2702de37baa902',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402207a4a71d519d5ab82af0711fae5bf5ada616629488d560a349e240b032a02a5bc022048fb6b82b5b094c98d741869a7a52255354bbbb581811cb5d15ee190c79694be4121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '695',
                    sequenceNo: 4294967295,
                },
                {
                    prevOut: {
                        txid: 'a2623898a9065557907606ee5c814010c7a7da66a60854b0e92f252f38bb5729',
                        outIdx: 0,
                    },
                    inputScript:
                        '473044022074378bc57f49a5dba5127aac1ad2da133e224d5b76f397a603fab7882f8200bd02202fde6ad260127ee26d8aa3f51fcf6e4753810045810e0c061729cb00a82506d24121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '100000',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e786563056a65737573',
                },
                {
                    value: '554',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '99389',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '78a2fec2c41e272ab6e332623b42de67bce3618a53e3df9ba86de55644d87f0e',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770805,
                hash: '0000000000000000009698ed4bd6f28896ac809e2c45cbcf139fed8ea2ee5084',
                timestamp: '1671337208',
            },
            timeFirstSeen: '1671337146',
            size: 398,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '6e353d5ba836a966a3ebc4f38ac36c852f79cdf1292f9fdaac2702de37baa902',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '918443b971c1d26721b9a07f7debdb99e9b4dd838ef106f4c058083be5a96a9c',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220079bbf42c773efc5ea597d0c3b4638a93159cff8a52dc55f817dcf8ec0e2ac3d022017e34bb01ccb55c4aa047892e481d5f36c7ceae9ef4af1ed455f6dc1909a0b564121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '1702',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656307616e74686f6e79',
                },
                {
                    value: '552',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '695',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '18130ccb9d0ee0616caabdab70d0e6217f8b7f42df8fd0a0a97a19523ab96b76',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770726,
                hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
                timestamp: '1671284562',
            },
            timeFirstSeen: '1671283639',
            size: 253,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '58029fa877d24169eba37f7afb581a83ec3462e9325add82e49e4043b862ba27',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '38362f5c620d29ec4463bd4fd8047c0b246da9a08b81e1c5b6fdcb9349d3a31b',
                        outIdx: 3,
                    },
                    inputScript:
                        '47304402207d5d7257262b85aa0cdce3139d10ad3c1c6db5c103a611c82edb2b8daf94abac02203222e9433c980da93d3058f16411eac95e103e97710c649f375ee3c891153b374121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '1250',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656306616e746f6e79',
                },
                {
                    value: '553',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
            ],
            lockTime: 0,
            block: {
                height: 770726,
                hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
                timestamp: '1671284562',
            },
            timeFirstSeen: '1671283596',
            size: 218,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '38362f5c620d29ec4463bd4fd8047c0b246da9a08b81e1c5b6fdcb9349d3a31b',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f0e22d26bb3485681d09cd5beb81c051ec75914681e622ef562c5c4ed98b556a',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402205781f3bd10576495d9cb697419d54c92b8dbcc221a8193d6b6a259033d233252022076006e7bcad69065646f88a50a101401b85913e734614e59850d268d80ca7f1c41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '14211',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript:
                        '6a0464726f70201c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e0400746162',
                },
                {
                    value: '1250',
                    outputScript:
                        '76a9147ab07df481649eb27c7ad9afda52b2a93d2f722a88ac',
                },
                {
                    value: '1250',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '2107c1e59fbeb2135a7223cccc24b45942e32c4151c4634fdc082a0b2a93af14',
                        outIdx: 0,
                    },
                },
                {
                    value: '1250',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '58029fa877d24169eba37f7afb581a83ec3462e9325add82e49e4043b862ba27',
                        outIdx: 0,
                    },
                },
                {
                    value: '1250',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '8551',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '0015b763db0554127ae9ad968bb62f7f321cf79cc5fad4da73a2c62b94ed01ee',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770726,
                hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
                timestamp: '1671284562',
            },
            timeFirstSeen: '1671283490',
            size: 380,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '918443b971c1d26721b9a07f7debdb99e9b4dd838ef106f4c058083be5a96a9c',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '93bf6a6593524d502165a9bae06d4557e938c52563f7f1c417038020a529d5dd',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220202b7ab1d8aa8ba3504b2f78f7da70d0b2ffd41a1f1c676c80212102a817304c0220295a44d52aada51bfad18c4c75971f82fa0e7fa195a55d99e554c82630a4cb794121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '2711',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e7865630572696e676f',
                },
                {
                    value: '554',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '1702',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '6e353d5ba836a966a3ebc4f38ac36c852f79cdf1292f9fdaac2702de37baa902',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770726,
                hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
                timestamp: '1671284562',
            },
            timeFirstSeen: '1671283281',
            size: 251,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '93bf6a6593524d502165a9bae06d4557e938c52563f7f1c417038020a529d5dd',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'af255ce3cb15ccdae13b5d2db608a9d304f9129497280bc69cdada0d75ee3f0d',
                        outIdx: 1,
                    },
                    inputScript:
                        '47304402204ed1e02b3c7db48592f49ee8f824fb4d631ba7160a7a3dacdb3d27051a73aa7e02202fda68b940e9a611cdb41fbbfcaf183b731446edfdfb60ebcceaf3797512a13e4121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '3721',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656304636f636f',
                },
                {
                    value: '555',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '2711',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '918443b971c1d26721b9a07f7debdb99e9b4dd838ef106f4c058083be5a96a9c',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770726,
                hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
                timestamp: '1671284562',
            },
            timeFirstSeen: '1671283258',
            size: 250,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: 'f0e22d26bb3485681d09cd5beb81c051ec75914681e622ef562c5c4ed98b556a',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '7339f06bc537a102686777d332dde68c2401fa9ba0d4c0396234f07b759776f7',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100ebad897dd8404a140d5abe7e839883260fa4bc583e435b870231cbbaf39f2c1002203fa4dda204e1ba4458a20b84d4135b903a96477677d6ac12c92a8cbdb385cbfe41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '15266',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a040074616203777466',
                },
                {
                    value: '600',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '14211',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '38362f5c620d29ec4463bd4fd8047c0b246da9a08b81e1c5b6fdcb9349d3a31b',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770726,
                hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
                timestamp: '1671284562',
            },
            timeFirstSeen: '1671283138',
            size: 245,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '7339f06bc537a102686777d332dde68c2401fa9ba0d4c0396234f07b759776f7',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '5156fe8bd9a7fd0b3c437d7a576a410f0d40fd38c394662b3febca5c79213c2b',
                        outIdx: 2,
                    },
                    inputScript:
                        '473044022034831021dd3847e03b94d62fc8e1d5965414e754b1b70279349a9f6a1bfae0110220577959f166573048a7c69fcc9b9240fd3b280ee4c60f4ecd4908906c436ab9d241210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '16276',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656304666f6f31',
                },
                {
                    value: '555',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '15266',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: 'f0e22d26bb3485681d09cd5beb81c051ec75914681e622ef562c5c4ed98b556a',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770725,
                hash: '00000000000000001542e0fab9f894a0648717a2114824a38790342a67b8359e',
                timestamp: '1671282776',
            },
            timeFirstSeen: '1671282670',
            size: 250,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '5156fe8bd9a7fd0b3c437d7a576a410f0d40fd38c394662b3febca5c79213c2b',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '75d77618864a5a3c203b9cde91584d2ada4ebbd87414315699fcce4a313ce952',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402206c396d437c8e8d71134141e60f757674424e160e8a77b2a2401ca2d9021261b702205b15b5689cdfcd46973a4ae983cc71f3222abbf27303becc018b159ebe2350ad41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '17286',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e7865630463726162',
                },
                {
                    value: '555',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '16276',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '7339f06bc537a102686777d332dde68c2401fa9ba0d4c0396234f07b759776f7',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770682,
                hash: '0000000000000000104259961aca521ae32ad30e831386a1da7837c13a168b48',
                timestamp: '1671246267',
            },
            timeFirstSeen: '1671245548',
            size: 250,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '75d77618864a5a3c203b9cde91584d2ada4ebbd87414315699fcce4a313ce952',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f9be89500f2b6baabf00d40c0ff4d8fb7c574085bb6007826f40c72df6971669',
                        outIdx: 2,
                    },
                    inputScript:
                        '4830450221008a917f7c7096204e80e1ee301cd8cb86a3892262b103dbe4605778e881cebb4102204dd89d9000f56f3203627f56b424961e7c039a237ddac1e2026d6591aa9c1f3241210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '18295',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656305706c6f6e6b',
                },
                {
                    value: '554',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '17286',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '5156fe8bd9a7fd0b3c437d7a576a410f0d40fd38c394662b3febca5c79213c2b',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770681,
                hash: '00000000000000000e0c35fc5e2facf93d4c2f9ecbe9c681ae5c321f6f465d6f',
                timestamp: '1671245405',
            },
            timeFirstSeen: '1671245402',
            size: 252,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: 'f9be89500f2b6baabf00d40c0ff4d8fb7c574085bb6007826f40c72df6971669',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'bb66ef4c5782f19015b974300c543d3899586ef7f95e988913196fc7db9629da',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220627bf25e795b536176a650c12d87de34731709f0e195ea6e34b53a9fd136884902200874a89160817cf8c1d81bf2e13a6ac6e9dd52d87223d39b3bc58fb96fb416d441210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '19301',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript:
                        '6a0400746162042e7865630b686868756875696f686b6a',
                },
                {
                    value: '551',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '18295',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '75d77618864a5a3c203b9cde91584d2ada4ebbd87414315699fcce4a313ce952',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770617,
                hash: '0000000000000000002d5b3a99e95813c249cee8f912a3d3bc3d0f9921631c39',
                timestamp: '1671200183',
            },
            timeFirstSeen: '1671199345',
            size: 257,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: 'bb66ef4c5782f19015b974300c543d3899586ef7f95e988913196fc7db9629da',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100fc4d19e4835744d2c74f3c52e81e2a477f399f073131ec9778159c4ffab781c8022064855627e8dc03a78bf191b4a5b20aadcab1e2443d099111c015c65909e321ff41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '20310',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e786563056666666666',
                },
                {
                    value: '554',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '19301',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: 'f9be89500f2b6baabf00d40c0ff4d8fb7c574085bb6007826f40c72df6971669',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770615,
                hash: '00000000000000000080281e58b1c8bae3ec951480137095882e95232f666709',
                timestamp: '1671199014',
            },
            timeFirstSeen: '1671198719',
            size: 252,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220081a1344141a454f297c64eaef533045374c8416835ef8c52cb5e6670df27cda02204d40a155e57bac442c85f3c91328c6acc4fe22738fb73041e3ecb7c23b3fbd5841210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '21318',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656306636f6f6c696f',
                },
                {
                    value: '553',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '20310',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: 'bb66ef4c5782f19015b974300c543d3899586ef7f95e988913196fc7db9629da',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770459,
                hash: '0000000000000000103ba3de40714b256f6f9b56f46613b43141a2dea984315e',
                timestamp: '1671112386',
            },
            timeFirstSeen: '1671111338',
            size: 252,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100c1dce1385c8185c5a058b3679966a1b68f7f8e0c74ac3c03c11870e8dfe4ce3d022016f3574a846b12ffc440528263a0139d170527dd2efdb46ae643dd30b3da969741210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '22329',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656303666f6f',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '21318',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770452,
                hash: '0000000000000000110940de16f07da16b7a5441694d2a5ace3e8faa7e04fc4e',
                timestamp: '1671109291',
            },
            timeFirstSeen: '1671108616',
            size: 250,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'fe9ae60ad1d947dfe041499b8f56b902779374fb2fb6662f91d5683c4c3ddb8b',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100fad2532abe7c1e2b57ebdbee0a43c4176f6f3389c27b178cb6b27a89fc607a2b02200276ab355eb99f0a6943e4551b2010ddf97b2afe25774b061140d62cd38b42d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '550',
                    sequenceNo: 4294967295,
                },
                {
                    prevOut: {
                        txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100a245067515681caacf1d6da90a8cc4964f0e6282e32325149a6ae7e5c6ae70ed02204bb213450b3f7bbf0a38ba045936157481261e8709c464f092e925ac4a1ee33f41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '23087',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e786563036e6673',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '22329',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770452,
                hash: '0000000000000000110940de16f07da16b7a5441694d2a5ace3e8faa7e04fc4e',
                timestamp: '1671109291',
            },
            timeFirstSeen: '1671108282',
            size: 398,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '1cc67f99c0da539449a9bb9f2ded3340d8de169115e8484562c8492159ad59d6',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100ad8dc3a6eaefbcdcceca15474c826e7454759f3f55c12af30e8b4ccdd66fe13f02204bbd62e3865499366f22063c34b471148679f82a88f3d4b66bd1395eccf2997941210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '550',
                    sequenceNo: 4294967295,
                },
                {
                    prevOut: {
                        txid: 'd826198de42c449731961fd4ba81b3d8b36a49ab85cd6bb846adf9bd8f460a90',
                        outIdx: 2,
                    },
                    inputScript:
                        '4830450221009a585d7a20e87f0b7a123c3674fabd6fd2907d50b6a0adfef705a62466b5737502202b540834f20b70c26f56df096044780254b14d5b4c7ed44e3e172c934a3b38d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '78689',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a040074616205657468616e',
                },
                {
                    value: '55400',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                    spentBy: {
                        txid: 'fd4ce09c3d527922870b5b22ee844edd0d3aadfcc86fac189afdf266fc9fa757',
                        outIdx: 0,
                    },
                },
                {
                    value: '23087',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770450,
                hash: '00000000000000000fe787306e26f0f28f7d1b46c4888890fc84537dde647f1c',
                timestamp: '1671107720',
            },
            timeFirstSeen: '1671107230',
            size: 395,
            isCoinbase: false,
            network: 'XEC',
        },
    ],
    numPages: 5,
};

export const mockTxHistoryLastPageResponse23Txs = {
    txs: [
        {
            txid: 'ef62d52405287e9599050a731652be5f5c074372d97dcd839752bf1b2c6d36d4',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '83587921692f5dfa057e3a70d2f8678fb412486433ae9c127e8420c2fa24f85e',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100877a85643a4c486fcdbac5d398a232d0deb61a4f0339a6d5c170bf9f5f6244360220730f2a2fd972702b8b32ce6dc31193a50a979b869eb89cacffd0086dab7283854121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '92872',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e78656303313233',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '91861',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '7edd06e2f2d753598c1654e392702fac5c8a3c58943148eb12086379f63d1296',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771148,
                hash: '00000000000000000620fecc8b57fcd303bb3a0983446d57dcce2de4d82e54b2',
                timestamp: '1671545851',
            },
            timeFirstSeen: '1671544702',
            size: 245,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '3a437f5550aeee740da958bff262c1750054d8553eeb1a4600ef3ff9b8bdeab6',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c33d1533587fa1f187e1d41b3e392e1a9ffe93c388ebd2a3d169fe6fe839291a',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220383d869e50ec7cbc6d6764b49d4d46637c0ebace244c25ce24f41da1fe5224710220047c08f11dcb53d7f7420147d4518dfd9f14cdf9befa5c5237e07098de8c1ea54121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '168827',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e78656303666f6f',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '167816',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: 'f720c61be27eebc4bab010f05e47c90e2223464b246a1f9b8a20075c7236de81',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771148,
                hash: '00000000000000000620fecc8b57fcd303bb3a0983446d57dcce2de4d82e54b2',
                timestamp: '1671545851',
            },
            timeFirstSeen: '1671544586',
            size: 244,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '83587921692f5dfa057e3a70d2f8678fb412486433ae9c127e8420c2fa24f85e',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '8b263bf76bacc1d55a8b573f1710d737254c01726514f2d19fb82fe1500fad12',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100addb7863063668d4dfdf0fa0df187474ecdc61d88d4da683a747e2b2a5ed11e802205381330fb55c48724ace90ee3f94e6b138080092305e42d2c309f7513b4dd0d04121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '93883',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e78656303666f6f',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '92872',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: 'ef62d52405287e9599050a731652be5f5c074372d97dcd839752bf1b2c6d36d4',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771147,
                hash: '00000000000000000f81b23a2483ca41bc2045933f7a710b78a5a43a856ed821',
                timestamp: '1671544545',
            },
            timeFirstSeen: '1671544499',
            size: 245,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '28c2d5bcef414d76edb39ebac09c967d085210b043066c609f9c515042c74c42',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '2f90d5288a1f6b9c612552737493f2a889c1abf40b55e9d42b57ef7bf2e37dae',
                        outIdx: 1,
                    },
                    inputScript:
                        '4730440220233cf424733707094439cd45706e05cc70d5924df09a6b81bf43016a8105485902204e9a5cd6b33b546ce49b970761501005dbf5a80a0c24e29f71b66ca326cf2eb64121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '600',
                    sequenceNo: 4294967295,
                },
                {
                    prevOut: {
                        txid: '659729f14200d99f28da595f7bbf8f1b4a961ce8b9b34118791330f6592a1caf',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100c723c49a813cd0ff1b7eec2fe5ee8fbf5084ede64f245fe10d219d32a5efdefb022068c1998c9af655b2b2cea90068d33fa8093c07c46ce08f88b95fdd9cc72083514121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '630',
                    sequenceNo: 4294967295,
                },
                {
                    prevOut: {
                        txid: 'a7ff94066153ccb355913fc2ff81e9de547e598aa8019e0269388d14a5ec2e78',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100be1d946fe6b3f3e41273059522d3208e0059b3e73b8a2bd89c4a64e4c1e06cb8022010cbd2db787ca2f036766973ed821da4f8a3a791e42e50ffda0484b913e628b14121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '640',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e78656303666f6f',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
            ],
            lockTime: 0,
            block: {
                height: 771136,
                hash: '000000000000000012dc049c175b19302e29eb7a1cd3f309bb0430cd5190d348',
                timestamp: '1671538537',
            },
            timeFirstSeen: '1671538038',
            size: 506,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: 'ee3209c3e7493cfdad6398a92aef70feb7f7feaf8e7c91903ca27b2edbab98a8',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '1ad4a6b08a536a86cb10aa6816f866c4f5675d53d405e1ccb9777992af295239',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100878ebe9c648f7efa0eca660e2f3348b97b7570ca59351a80e9e6732fc6d080fd022027defc7b866bb01bb2a1c198eac1cca1de3d5263556e74e1741919d6f14107fa4121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '97023',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e786563046a6f6579',
                },
                {
                    value: '555',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '96013',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: 'e8ba20bbf01f59c66bd5ebc1f29ec41c9607a72c48bcb5a4cf972f423186103a',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771112,
                hash: '00000000000000000478e70d295fc1532fce78f79f2e1dde96073d6bcb09697d',
                timestamp: '1671523265',
            },
            timeFirstSeen: '1671522778',
            size: 246,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '446c1c3d979deed2b81258d907343c09091bc349352005d3a5804c97c611d19b',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '45c838577b52d532c46caa743a0a46edd4876b6f8e9d0d58ca094b9d70afade3',
                        outIdx: 248,
                    },
                    inputScript:
                        '473044022006ee5e5064d9eaef4c56e4a9b578d4a2dff87fae58624ccb6e34d547a3f607f90220674cbd244370f110fc88b49ac983b300c2f1cba3523332dff3486daa49d1efc94121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '179533',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e786563036e6673',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '178522',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '20182fb85164e7c0724cb42455ee2758e4c996ee613690d03eb96ba0ab2aebd2',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771103,
                hash: '00000000000000000f36aead0613a57660de0a9ca5d587b64b5954e27622c469',
                timestamp: '1671519222',
            },
            timeFirstSeen: '1671518864',
            size: 244,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '78a2fec2c41e272ab6e332623b42de67bce3618a53e3df9ba86de55644d87f0e',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '18130ccb9d0ee0616caabdab70d0e6217f8b7f42df8fd0a0a97a19523ab96b76',
                        outIdx: 2,
                    },
                    inputScript:
                        '473044022014aeb88c9baa07c5ce64030e2039767498ee561c2b07d26936e6798cdd484c08022052406b391c97ddf08359e54d2cb337e2eb01a9fae537cc8f3c54f7c4458e36774121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '99389',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a042e786563036e6673',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '98378',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '1ad4a6b08a536a86cb10aa6816f866c4f5675d53d405e1ccb9777992af295239',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 771103,
                hash: '00000000000000000f36aead0613a57660de0a9ca5d587b64b5954e27622c469',
                timestamp: '1671519222',
            },
            timeFirstSeen: '1671518736',
            size: 244,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '18130ccb9d0ee0616caabdab70d0e6217f8b7f42df8fd0a0a97a19523ab96b76',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '6e353d5ba836a966a3ebc4f38ac36c852f79cdf1292f9fdaac2702de37baa902',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402207a4a71d519d5ab82af0711fae5bf5ada616629488d560a349e240b032a02a5bc022048fb6b82b5b094c98d741869a7a52255354bbbb581811cb5d15ee190c79694be4121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '695',
                    sequenceNo: 4294967295,
                },
                {
                    prevOut: {
                        txid: 'a2623898a9065557907606ee5c814010c7a7da66a60854b0e92f252f38bb5729',
                        outIdx: 0,
                    },
                    inputScript:
                        '473044022074378bc57f49a5dba5127aac1ad2da133e224d5b76f397a603fab7882f8200bd02202fde6ad260127ee26d8aa3f51fcf6e4753810045810e0c061729cb00a82506d24121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '100000',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e786563056a65737573',
                },
                {
                    value: '554',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '99389',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '78a2fec2c41e272ab6e332623b42de67bce3618a53e3df9ba86de55644d87f0e',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770805,
                hash: '0000000000000000009698ed4bd6f28896ac809e2c45cbcf139fed8ea2ee5084',
                timestamp: '1671337208',
            },
            timeFirstSeen: '1671337146',
            size: 398,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '6e353d5ba836a966a3ebc4f38ac36c852f79cdf1292f9fdaac2702de37baa902',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '918443b971c1d26721b9a07f7debdb99e9b4dd838ef106f4c058083be5a96a9c',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220079bbf42c773efc5ea597d0c3b4638a93159cff8a52dc55f817dcf8ec0e2ac3d022017e34bb01ccb55c4aa047892e481d5f36c7ceae9ef4af1ed455f6dc1909a0b564121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '1702',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656307616e74686f6e79',
                },
                {
                    value: '552',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '695',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '18130ccb9d0ee0616caabdab70d0e6217f8b7f42df8fd0a0a97a19523ab96b76',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770726,
                hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
                timestamp: '1671284562',
            },
            timeFirstSeen: '1671283639',
            size: 253,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '58029fa877d24169eba37f7afb581a83ec3462e9325add82e49e4043b862ba27',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '38362f5c620d29ec4463bd4fd8047c0b246da9a08b81e1c5b6fdcb9349d3a31b',
                        outIdx: 3,
                    },
                    inputScript:
                        '47304402207d5d7257262b85aa0cdce3139d10ad3c1c6db5c103a611c82edb2b8daf94abac02203222e9433c980da93d3058f16411eac95e103e97710c649f375ee3c891153b374121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '1250',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656306616e746f6e79',
                },
                {
                    value: '553',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
            ],
            lockTime: 0,
            block: {
                height: 770726,
                hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
                timestamp: '1671284562',
            },
            timeFirstSeen: '1671283596',
            size: 218,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '38362f5c620d29ec4463bd4fd8047c0b246da9a08b81e1c5b6fdcb9349d3a31b',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f0e22d26bb3485681d09cd5beb81c051ec75914681e622ef562c5c4ed98b556a',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402205781f3bd10576495d9cb697419d54c92b8dbcc221a8193d6b6a259033d233252022076006e7bcad69065646f88a50a101401b85913e734614e59850d268d80ca7f1c41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '14211',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript:
                        '6a0464726f70201c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e0400746162',
                },
                {
                    value: '1250',
                    outputScript:
                        '76a9147ab07df481649eb27c7ad9afda52b2a93d2f722a88ac',
                },
                {
                    value: '1250',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '2107c1e59fbeb2135a7223cccc24b45942e32c4151c4634fdc082a0b2a93af14',
                        outIdx: 0,
                    },
                },
                {
                    value: '1250',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '58029fa877d24169eba37f7afb581a83ec3462e9325add82e49e4043b862ba27',
                        outIdx: 0,
                    },
                },
                {
                    value: '1250',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '8551',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '0015b763db0554127ae9ad968bb62f7f321cf79cc5fad4da73a2c62b94ed01ee',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770726,
                hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
                timestamp: '1671284562',
            },
            timeFirstSeen: '1671283490',
            size: 380,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '918443b971c1d26721b9a07f7debdb99e9b4dd838ef106f4c058083be5a96a9c',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '93bf6a6593524d502165a9bae06d4557e938c52563f7f1c417038020a529d5dd',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220202b7ab1d8aa8ba3504b2f78f7da70d0b2ffd41a1f1c676c80212102a817304c0220295a44d52aada51bfad18c4c75971f82fa0e7fa195a55d99e554c82630a4cb794121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '2711',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e7865630572696e676f',
                },
                {
                    value: '554',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '1702',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '6e353d5ba836a966a3ebc4f38ac36c852f79cdf1292f9fdaac2702de37baa902',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770726,
                hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
                timestamp: '1671284562',
            },
            timeFirstSeen: '1671283281',
            size: 251,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '93bf6a6593524d502165a9bae06d4557e938c52563f7f1c417038020a529d5dd',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'af255ce3cb15ccdae13b5d2db608a9d304f9129497280bc69cdada0d75ee3f0d',
                        outIdx: 1,
                    },
                    inputScript:
                        '47304402204ed1e02b3c7db48592f49ee8f824fb4d631ba7160a7a3dacdb3d27051a73aa7e02202fda68b940e9a611cdb41fbbfcaf183b731446edfdfb60ebcceaf3797512a13e4121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    value: '3721',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656304636f636f',
                },
                {
                    value: '555',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '2711',
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '918443b971c1d26721b9a07f7debdb99e9b4dd838ef106f4c058083be5a96a9c',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770726,
                hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
                timestamp: '1671284562',
            },
            timeFirstSeen: '1671283258',
            size: 250,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: 'f0e22d26bb3485681d09cd5beb81c051ec75914681e622ef562c5c4ed98b556a',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '7339f06bc537a102686777d332dde68c2401fa9ba0d4c0396234f07b759776f7',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100ebad897dd8404a140d5abe7e839883260fa4bc583e435b870231cbbaf39f2c1002203fa4dda204e1ba4458a20b84d4135b903a96477677d6ac12c92a8cbdb385cbfe41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '15266',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a040074616203777466',
                },
                {
                    value: '600',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '14211',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '38362f5c620d29ec4463bd4fd8047c0b246da9a08b81e1c5b6fdcb9349d3a31b',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770726,
                hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
                timestamp: '1671284562',
            },
            timeFirstSeen: '1671283138',
            size: 245,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '7339f06bc537a102686777d332dde68c2401fa9ba0d4c0396234f07b759776f7',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '5156fe8bd9a7fd0b3c437d7a576a410f0d40fd38c394662b3febca5c79213c2b',
                        outIdx: 2,
                    },
                    inputScript:
                        '473044022034831021dd3847e03b94d62fc8e1d5965414e754b1b70279349a9f6a1bfae0110220577959f166573048a7c69fcc9b9240fd3b280ee4c60f4ecd4908906c436ab9d241210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '16276',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656304666f6f31',
                },
                {
                    value: '555',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '15266',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: 'f0e22d26bb3485681d09cd5beb81c051ec75914681e622ef562c5c4ed98b556a',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770725,
                hash: '00000000000000001542e0fab9f894a0648717a2114824a38790342a67b8359e',
                timestamp: '1671282776',
            },
            timeFirstSeen: '1671282670',
            size: 250,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '5156fe8bd9a7fd0b3c437d7a576a410f0d40fd38c394662b3febca5c79213c2b',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '75d77618864a5a3c203b9cde91584d2ada4ebbd87414315699fcce4a313ce952',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402206c396d437c8e8d71134141e60f757674424e160e8a77b2a2401ca2d9021261b702205b15b5689cdfcd46973a4ae983cc71f3222abbf27303becc018b159ebe2350ad41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '17286',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e7865630463726162',
                },
                {
                    value: '555',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '16276',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '7339f06bc537a102686777d332dde68c2401fa9ba0d4c0396234f07b759776f7',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770682,
                hash: '0000000000000000104259961aca521ae32ad30e831386a1da7837c13a168b48',
                timestamp: '1671246267',
            },
            timeFirstSeen: '1671245548',
            size: 250,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '75d77618864a5a3c203b9cde91584d2ada4ebbd87414315699fcce4a313ce952',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f9be89500f2b6baabf00d40c0ff4d8fb7c574085bb6007826f40c72df6971669',
                        outIdx: 2,
                    },
                    inputScript:
                        '4830450221008a917f7c7096204e80e1ee301cd8cb86a3892262b103dbe4605778e881cebb4102204dd89d9000f56f3203627f56b424961e7c039a237ddac1e2026d6591aa9c1f3241210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '18295',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656305706c6f6e6b',
                },
                {
                    value: '554',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '17286',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '5156fe8bd9a7fd0b3c437d7a576a410f0d40fd38c394662b3febca5c79213c2b',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770681,
                hash: '00000000000000000e0c35fc5e2facf93d4c2f9ecbe9c681ae5c321f6f465d6f',
                timestamp: '1671245405',
            },
            timeFirstSeen: '1671245402',
            size: 252,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: 'f9be89500f2b6baabf00d40c0ff4d8fb7c574085bb6007826f40c72df6971669',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'bb66ef4c5782f19015b974300c543d3899586ef7f95e988913196fc7db9629da',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220627bf25e795b536176a650c12d87de34731709f0e195ea6e34b53a9fd136884902200874a89160817cf8c1d81bf2e13a6ac6e9dd52d87223d39b3bc58fb96fb416d441210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '19301',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript:
                        '6a0400746162042e7865630b686868756875696f686b6a',
                },
                {
                    value: '551',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '18295',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '75d77618864a5a3c203b9cde91584d2ada4ebbd87414315699fcce4a313ce952',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770617,
                hash: '0000000000000000002d5b3a99e95813c249cee8f912a3d3bc3d0f9921631c39',
                timestamp: '1671200183',
            },
            timeFirstSeen: '1671199345',
            size: 257,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: 'bb66ef4c5782f19015b974300c543d3899586ef7f95e988913196fc7db9629da',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100fc4d19e4835744d2c74f3c52e81e2a477f399f073131ec9778159c4ffab781c8022064855627e8dc03a78bf191b4a5b20aadcab1e2443d099111c015c65909e321ff41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '20310',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e786563056666666666',
                },
                {
                    value: '554',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '19301',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: 'f9be89500f2b6baabf00d40c0ff4d8fb7c574085bb6007826f40c72df6971669',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770615,
                hash: '00000000000000000080281e58b1c8bae3ec951480137095882e95232f666709',
                timestamp: '1671199014',
            },
            timeFirstSeen: '1671198719',
            size: 252,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220081a1344141a454f297c64eaef533045374c8416835ef8c52cb5e6670df27cda02204d40a155e57bac442c85f3c91328c6acc4fe22738fb73041e3ecb7c23b3fbd5841210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '21318',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656306636f6f6c696f',
                },
                {
                    value: '553',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '20310',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: 'bb66ef4c5782f19015b974300c543d3899586ef7f95e988913196fc7db9629da',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770459,
                hash: '0000000000000000103ba3de40714b256f6f9b56f46613b43141a2dea984315e',
                timestamp: '1671112386',
            },
            timeFirstSeen: '1671111338',
            size: 252,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100c1dce1385c8185c5a058b3679966a1b68f7f8e0c74ac3c03c11870e8dfe4ce3d022016f3574a846b12ffc440528263a0139d170527dd2efdb46ae643dd30b3da969741210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '22329',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e78656303666f6f',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '21318',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770452,
                hash: '0000000000000000110940de16f07da16b7a5441694d2a5ace3e8faa7e04fc4e',
                timestamp: '1671109291',
            },
            timeFirstSeen: '1671108616',
            size: 250,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'fe9ae60ad1d947dfe041499b8f56b902779374fb2fb6662f91d5683c4c3ddb8b',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100fad2532abe7c1e2b57ebdbee0a43c4176f6f3389c27b178cb6b27a89fc607a2b02200276ab355eb99f0a6943e4551b2010ddf97b2afe25774b061140d62cd38b42d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '550',
                    sequenceNo: 4294967295,
                },
                {
                    prevOut: {
                        txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100a245067515681caacf1d6da90a8cc4964f0e6282e32325149a6ae7e5c6ae70ed02204bb213450b3f7bbf0a38ba045936157481261e8709c464f092e925ac4a1ee33f41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '23087',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a0400746162042e786563036e6673',
                },
                {
                    value: '556',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                },
                {
                    value: '22329',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770452,
                hash: '0000000000000000110940de16f07da16b7a5441694d2a5ace3e8faa7e04fc4e',
                timestamp: '1671109291',
            },
            timeFirstSeen: '1671108282',
            size: 398,
            isCoinbase: false,
            network: 'XEC',
        },
        {
            txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '1cc67f99c0da539449a9bb9f2ded3340d8de169115e8484562c8492159ad59d6',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100ad8dc3a6eaefbcdcceca15474c826e7454759f3f55c12af30e8b4ccdd66fe13f02204bbd62e3865499366f22063c34b471148679f82a88f3d4b66bd1395eccf2997941210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '550',
                    sequenceNo: 4294967295,
                },
                {
                    prevOut: {
                        txid: 'd826198de42c449731961fd4ba81b3d8b36a49ab85cd6bb846adf9bd8f460a90',
                        outIdx: 2,
                    },
                    inputScript:
                        '4830450221009a585d7a20e87f0b7a123c3674fabd6fd2907d50b6a0adfef705a62466b5737502202b540834f20b70c26f56df096044780254b14d5b4c7ed44e3e172c934a3b38d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    value: '78689',
                    sequenceNo: 4294967295,
                },
            ],
            outputs: [
                {
                    value: '0',
                    outputScript: '6a040074616205657468616e',
                },
                {
                    value: '55400',
                    outputScript:
                        '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                    spentBy: {
                        txid: 'fd4ce09c3d527922870b5b22ee844edd0d3aadfcc86fac189afdf266fc9fa757',
                        outIdx: 0,
                    },
                },
                {
                    value: '23087',
                    outputScript:
                        '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                    spentBy: {
                        txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            block: {
                height: 770450,
                hash: '00000000000000000fe787306e26f0f28f7d1b46c4888890fc84537dde647f1c',
                timestamp: '1671107720',
            },
            timeFirstSeen: '1671107230',
            size: 395,
            isCoinbase: false,
            network: 'XEC',
        },
    ],
    numPages: 5,
};

export const mockTxHistoryOfAliasPaymentAddress = [
    {
        txid: 'f720c61be27eebc4bab010f05e47c90e2223464b246a1f9b8a20075c7236de81',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '3a437f5550aeee740da958bff262c1750054d8553eeb1a4600ef3ff9b8bdeab6',
                    outIdx: 2,
                },
                inputScript:
                    '48304502210096fe24492b82265dc28444e72b4fe7602ea4eff8ae30eb7665e189123fe5fd08022014dbe711d852909e27bc22d16bdf2899d828d1f80896c6bfa5cf202de4d990754121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '167816',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                // the following OP_RETURN script corresponds to a 51 char alias which should not be extracted
                // aliasName: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaacbd
                outputScript:
                    '6a042e78656333616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161636264',
            },
            {
                value: '551',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '166807',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1671544936',
        size: 247,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'f720c61be27eebc4bab010f05e47c90e2223464b246a1f9b8a20075c7236de81',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '3a437f5550aeee740da958bff262c1750054d8553eeb1a4600ef3ff9b8bdeab6',
                    outIdx: 2,
                },
                inputScript:
                    '48304502210096fe24492b82265dc28444e72b4fe7602ea4eff8ae30eb7665e189123fe5fd08022014dbe711d852909e27bc22d16bdf2899d828d1f80896c6bfa5cf202de4d990754121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '167816',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a042e7865632063617368746162', // 'cashtab' alias registration outside of cashtab
            },
            {
                value: '559', // intentionally setting payment to higher than the minimum fee to ensure it is still parsed as a valid alias
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '166807',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1671544936',
        size: 247,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'f720c61be27eebc4bab010f05e47c90e2223464b246a1f9b8a20075c7236de81',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '3a437f5550aeee740da958bff262c1750054d8553eeb1a4600ef3ff9b8bdeab6',
                    outIdx: 2,
                },
                inputScript:
                    '48304502210096fe24492b82265dc28444e72b4fe7602ea4eff8ae30eb7665e189123fe5fd08022014dbe711d852909e27bc22d16bdf2899d828d1f80896c6bfa5cf202de4d990754121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '167816',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a042e7865630572616e6765',
            },
            {
                value: '559', // intentionally setting payment to higher than the minimum fee to ensure it is still parsed as a valid alias
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '166807',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1671544936',
        size: 247,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'ef62d52405287e9599050a731652be5f5c074372d97dcd839752bf1b2c6d36d4',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '83587921692f5dfa057e3a70d2f8678fb412486433ae9c127e8420c2fa24f85e',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100877a85643a4c486fcdbac5d398a232d0deb61a4f0339a6d5c170bf9f5f6244360220730f2a2fd972702b8b32ce6dc31193a50a979b869eb89cacffd0086dab7283854121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '92872',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a042e78656303313233',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '91861',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1671544702',
        size: 245,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '3a437f5550aeee740da958bff262c1750054d8553eeb1a4600ef3ff9b8bdeab6',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c33d1533587fa1f187e1d41b3e392e1a9ffe93c388ebd2a3d169fe6fe839291a',
                    outIdx: 2,
                },
                inputScript:
                    '4730440220383d869e50ec7cbc6d6764b49d4d46637c0ebace244c25ce24f41da1fe5224710220047c08f11dcb53d7f7420147d4518dfd9f14cdf9befa5c5237e07098de8c1ea54121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '168827',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a042e78656303666f6f',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '167816',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                spentBy: {
                    txid: 'f720c61be27eebc4bab010f05e47c90e2223464b246a1f9b8a20075c7236de81',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1671544586',
        size: 244,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '83587921692f5dfa057e3a70d2f8678fb412486433ae9c127e8420c2fa24f85e',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '8b263bf76bacc1d55a8b573f1710d737254c01726514f2d19fb82fe1500fad12',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100addb7863063668d4dfdf0fa0df187474ecdc61d88d4da683a747e2b2a5ed11e802205381330fb55c48724ace90ee3f94e6b138080092305e42d2c309f7513b4dd0d04121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '93883',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a042e78656303666f6f',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '92872',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                spentBy: {
                    txid: 'ef62d52405287e9599050a731652be5f5c074372d97dcd839752bf1b2c6d36d4',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 771147,
            hash: '00000000000000000f81b23a2483ca41bc2045933f7a710b78a5a43a856ed821',
            timestamp: '1671544545',
        },
        timeFirstSeen: '1671544499',
        size: 245,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '28c2d5bcef414d76edb39ebac09c967d085210b043066c609f9c515042c74c42',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '2f90d5288a1f6b9c612552737493f2a889c1abf40b55e9d42b57ef7bf2e37dae',
                    outIdx: 1,
                },
                inputScript:
                    '4730440220233cf424733707094439cd45706e05cc70d5924df09a6b81bf43016a8105485902204e9a5cd6b33b546ce49b970761501005dbf5a80a0c24e29f71b66ca326cf2eb64121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '600',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '659729f14200d99f28da595f7bbf8f1b4a961ce8b9b34118791330f6592a1caf',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100c723c49a813cd0ff1b7eec2fe5ee8fbf5084ede64f245fe10d219d32a5efdefb022068c1998c9af655b2b2cea90068d33fa8093c07c46ce08f88b95fdd9cc72083514121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '630',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'a7ff94066153ccb355913fc2ff81e9de547e598aa8019e0269388d14a5ec2e78',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100be1d946fe6b3f3e41273059522d3208e0059b3e73b8a2bd89c4a64e4c1e06cb8022010cbd2db787ca2f036766973ed821da4f8a3a791e42e50ffda0484b913e628b14121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '640',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a042e78656303666f6f',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 771136,
            hash: '000000000000000012dc049c175b19302e29eb7a1cd3f309bb0430cd5190d348',
            timestamp: '1671538537',
        },
        timeFirstSeen: '1671538038',
        size: 506,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'ee3209c3e7493cfdad6398a92aef70feb7f7feaf8e7c91903ca27b2edbab98a8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1ad4a6b08a536a86cb10aa6816f866c4f5675d53d405e1ccb9777992af295239',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100878ebe9c648f7efa0eca660e2f3348b97b7570ca59351a80e9e6732fc6d080fd022027defc7b866bb01bb2a1c198eac1cca1de3d5263556e74e1741919d6f14107fa4121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '97023',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a042e786563046a6f6579',
            },
            {
                value: '555',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '96013',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                spentBy: {
                    txid: 'e8ba20bbf01f59c66bd5ebc1f29ec41c9607a72c48bcb5a4cf972f423186103a',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 771112,
            hash: '00000000000000000478e70d295fc1532fce78f79f2e1dde96073d6bcb09697d',
            timestamp: '1671523265',
        },
        timeFirstSeen: '1671522778',
        size: 246,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '446c1c3d979deed2b81258d907343c09091bc349352005d3a5804c97c611d19b',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '45c838577b52d532c46caa743a0a46edd4876b6f8e9d0d58ca094b9d70afade3',
                    outIdx: 248,
                },
                inputScript:
                    '473044022006ee5e5064d9eaef4c56e4a9b578d4a2dff87fae58624ccb6e34d547a3f607f90220674cbd244370f110fc88b49ac983b300c2f1cba3523332dff3486daa49d1efc94121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '179533',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a042e786563036e6673',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '178522',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                spentBy: {
                    txid: '20182fb85164e7c0724cb42455ee2758e4c996ee613690d03eb96ba0ab2aebd2',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 771103,
            hash: '00000000000000000f36aead0613a57660de0a9ca5d587b64b5954e27622c469',
            timestamp: '1671519222',
        },
        timeFirstSeen: '1671518864',
        size: 244,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '78a2fec2c41e272ab6e332623b42de67bce3618a53e3df9ba86de55644d87f0e',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '18130ccb9d0ee0616caabdab70d0e6217f8b7f42df8fd0a0a97a19523ab96b76',
                    outIdx: 2,
                },
                inputScript:
                    '473044022014aeb88c9baa07c5ce64030e2039767498ee561c2b07d26936e6798cdd484c08022052406b391c97ddf08359e54d2cb337e2eb01a9fae537cc8f3c54f7c4458e36774121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '99389',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a042e786563036e6673',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '98378',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                spentBy: {
                    txid: '1ad4a6b08a536a86cb10aa6816f866c4f5675d53d405e1ccb9777992af295239',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 771103,
            hash: '00000000000000000f36aead0613a57660de0a9ca5d587b64b5954e27622c469',
            timestamp: '1671519222',
        },
        timeFirstSeen: '1671518736',
        size: 244,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '18130ccb9d0ee0616caabdab70d0e6217f8b7f42df8fd0a0a97a19523ab96b76',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '6e353d5ba836a966a3ebc4f38ac36c852f79cdf1292f9fdaac2702de37baa902',
                    outIdx: 2,
                },
                inputScript:
                    '47304402207a4a71d519d5ab82af0711fae5bf5ada616629488d560a349e240b032a02a5bc022048fb6b82b5b094c98d741869a7a52255354bbbb581811cb5d15ee190c79694be4121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '695',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'a2623898a9065557907606ee5c814010c7a7da66a60854b0e92f252f38bb5729',
                    outIdx: 0,
                },
                inputScript:
                    '473044022074378bc57f49a5dba5127aac1ad2da133e224d5b76f397a603fab7882f8200bd02202fde6ad260127ee26d8aa3f51fcf6e4753810045810e0c061729cb00a82506d24121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '100000',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e786563056a65737573',
            },
            {
                value: '554',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '99389',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                spentBy: {
                    txid: '78a2fec2c41e272ab6e332623b42de67bce3618a53e3df9ba86de55644d87f0e',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770805,
            hash: '0000000000000000009698ed4bd6f28896ac809e2c45cbcf139fed8ea2ee5084',
            timestamp: '1671337208',
        },
        timeFirstSeen: '1671337146',
        size: 398,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '6e353d5ba836a966a3ebc4f38ac36c852f79cdf1292f9fdaac2702de37baa902',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '918443b971c1d26721b9a07f7debdb99e9b4dd838ef106f4c058083be5a96a9c',
                    outIdx: 2,
                },
                inputScript:
                    '4730440220079bbf42c773efc5ea597d0c3b4638a93159cff8a52dc55f817dcf8ec0e2ac3d022017e34bb01ccb55c4aa047892e481d5f36c7ceae9ef4af1ed455f6dc1909a0b564121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '1702',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e78656307616e74686f6e79',
            },
            {
                value: '552',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '695',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                spentBy: {
                    txid: '18130ccb9d0ee0616caabdab70d0e6217f8b7f42df8fd0a0a97a19523ab96b76',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770726,
            hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
            timestamp: '1671284562',
        },
        timeFirstSeen: '1671283639',
        size: 253,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '58029fa877d24169eba37f7afb581a83ec3462e9325add82e49e4043b862ba27',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '38362f5c620d29ec4463bd4fd8047c0b246da9a08b81e1c5b6fdcb9349d3a31b',
                    outIdx: 3,
                },
                inputScript:
                    '47304402207d5d7257262b85aa0cdce3139d10ad3c1c6db5c103a611c82edb2b8daf94abac02203222e9433c980da93d3058f16411eac95e103e97710c649f375ee3c891153b374121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '1250',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e78656306616e746f6e79',
            },
            {
                value: '553',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 770726,
            hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
            timestamp: '1671284562',
        },
        timeFirstSeen: '1671283596',
        size: 218,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '38362f5c620d29ec4463bd4fd8047c0b246da9a08b81e1c5b6fdcb9349d3a31b',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'f0e22d26bb3485681d09cd5beb81c051ec75914681e622ef562c5c4ed98b556a',
                    outIdx: 2,
                },
                inputScript:
                    '47304402205781f3bd10576495d9cb697419d54c92b8dbcc221a8193d6b6a259033d233252022076006e7bcad69065646f88a50a101401b85913e734614e59850d268d80ca7f1c41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '14211',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a0464726f70201c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e0400746162',
            },
            {
                value: '1250',
                outputScript:
                    '76a9147ab07df481649eb27c7ad9afda52b2a93d2f722a88ac',
            },
            {
                value: '1250',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '2107c1e59fbeb2135a7223cccc24b45942e32c4151c4634fdc082a0b2a93af14',
                    outIdx: 0,
                },
            },
            {
                value: '1250',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                spentBy: {
                    txid: '58029fa877d24169eba37f7afb581a83ec3462e9325add82e49e4043b862ba27',
                    outIdx: 0,
                },
            },
            {
                value: '1250',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '8551',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '0015b763db0554127ae9ad968bb62f7f321cf79cc5fad4da73a2c62b94ed01ee',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770726,
            hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
            timestamp: '1671284562',
        },
        timeFirstSeen: '1671283490',
        size: 380,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '918443b971c1d26721b9a07f7debdb99e9b4dd838ef106f4c058083be5a96a9c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '93bf6a6593524d502165a9bae06d4557e938c52563f7f1c417038020a529d5dd',
                    outIdx: 2,
                },
                inputScript:
                    '4730440220202b7ab1d8aa8ba3504b2f78f7da70d0b2ffd41a1f1c676c80212102a817304c0220295a44d52aada51bfad18c4c75971f82fa0e7fa195a55d99e554c82630a4cb794121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '2711',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e7865630572696e676f',
            },
            {
                value: '554',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '1702',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                spentBy: {
                    txid: '6e353d5ba836a966a3ebc4f38ac36c852f79cdf1292f9fdaac2702de37baa902',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770726,
            hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
            timestamp: '1671284562',
        },
        timeFirstSeen: '1671283281',
        size: 251,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '93bf6a6593524d502165a9bae06d4557e938c52563f7f1c417038020a529d5dd',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'af255ce3cb15ccdae13b5d2db608a9d304f9129497280bc69cdada0d75ee3f0d',
                    outIdx: 1,
                },
                inputScript:
                    '47304402204ed1e02b3c7db48592f49ee8f824fb4d631ba7160a7a3dacdb3d27051a73aa7e02202fda68b940e9a611cdb41fbbfcaf183b731446edfdfb60ebcceaf3797512a13e4121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                value: '3721',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e78656304636f636f',
            },
            {
                value: '555',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '2711',
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                spentBy: {
                    txid: '918443b971c1d26721b9a07f7debdb99e9b4dd838ef106f4c058083be5a96a9c',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770726,
            hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
            timestamp: '1671284562',
        },
        timeFirstSeen: '1671283258',
        size: 250,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'f0e22d26bb3485681d09cd5beb81c051ec75914681e622ef562c5c4ed98b556a',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '7339f06bc537a102686777d332dde68c2401fa9ba0d4c0396234f07b759776f7',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100ebad897dd8404a140d5abe7e839883260fa4bc583e435b870231cbbaf39f2c1002203fa4dda204e1ba4458a20b84d4135b903a96477677d6ac12c92a8cbdb385cbfe41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '15266',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a040074616203777466',
            },
            {
                value: '600',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '14211',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '38362f5c620d29ec4463bd4fd8047c0b246da9a08b81e1c5b6fdcb9349d3a31b',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770726,
            hash: '000000000000000008969c6be39908cf8ce5b507d3dbda11ddebc26440a9a4aa',
            timestamp: '1671284562',
        },
        timeFirstSeen: '1671283138',
        size: 245,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '7339f06bc537a102686777d332dde68c2401fa9ba0d4c0396234f07b759776f7',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5156fe8bd9a7fd0b3c437d7a576a410f0d40fd38c394662b3febca5c79213c2b',
                    outIdx: 2,
                },
                inputScript:
                    '473044022034831021dd3847e03b94d62fc8e1d5965414e754b1b70279349a9f6a1bfae0110220577959f166573048a7c69fcc9b9240fd3b280ee4c60f4ecd4908906c436ab9d241210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '16276',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e78656304666f6f31',
            },
            {
                value: '555',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '15266',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: 'f0e22d26bb3485681d09cd5beb81c051ec75914681e622ef562c5c4ed98b556a',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770725,
            hash: '00000000000000001542e0fab9f894a0648717a2114824a38790342a67b8359e',
            timestamp: '1671282776',
        },
        timeFirstSeen: '1671282670',
        size: 250,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '5156fe8bd9a7fd0b3c437d7a576a410f0d40fd38c394662b3febca5c79213c2b',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '75d77618864a5a3c203b9cde91584d2ada4ebbd87414315699fcce4a313ce952',
                    outIdx: 2,
                },
                inputScript:
                    '47304402206c396d437c8e8d71134141e60f757674424e160e8a77b2a2401ca2d9021261b702205b15b5689cdfcd46973a4ae983cc71f3222abbf27303becc018b159ebe2350ad41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '17286',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e7865630463726162',
            },
            {
                value: '555',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '16276',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '7339f06bc537a102686777d332dde68c2401fa9ba0d4c0396234f07b759776f7',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770682,
            hash: '0000000000000000104259961aca521ae32ad30e831386a1da7837c13a168b48',
            timestamp: '1671246267',
        },
        timeFirstSeen: '1671245548',
        size: 250,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '75d77618864a5a3c203b9cde91584d2ada4ebbd87414315699fcce4a313ce952',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'f9be89500f2b6baabf00d40c0ff4d8fb7c574085bb6007826f40c72df6971669',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221008a917f7c7096204e80e1ee301cd8cb86a3892262b103dbe4605778e881cebb4102204dd89d9000f56f3203627f56b424961e7c039a237ddac1e2026d6591aa9c1f3241210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '18295',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e78656305706c6f6e6b',
            },
            {
                value: '554',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '17286',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '5156fe8bd9a7fd0b3c437d7a576a410f0d40fd38c394662b3febca5c79213c2b',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770681,
            hash: '00000000000000000e0c35fc5e2facf93d4c2f9ecbe9c681ae5c321f6f465d6f',
            timestamp: '1671245405',
        },
        timeFirstSeen: '1671245402',
        size: 252,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'f9be89500f2b6baabf00d40c0ff4d8fb7c574085bb6007826f40c72df6971669',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'bb66ef4c5782f19015b974300c543d3899586ef7f95e988913196fc7db9629da',
                    outIdx: 2,
                },
                inputScript:
                    '4730440220627bf25e795b536176a650c12d87de34731709f0e195ea6e34b53a9fd136884902200874a89160817cf8c1d81bf2e13a6ac6e9dd52d87223d39b3bc58fb96fb416d441210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '19301',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e7865630b686868756875696f686b6a',
            },
            {
                value: '551',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '18295',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '75d77618864a5a3c203b9cde91584d2ada4ebbd87414315699fcce4a313ce952',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770617,
            hash: '0000000000000000002d5b3a99e95813c249cee8f912a3d3bc3d0f9921631c39',
            timestamp: '1671200183',
        },
        timeFirstSeen: '1671199345',
        size: 257,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'bb66ef4c5782f19015b974300c543d3899586ef7f95e988913196fc7db9629da',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100fc4d19e4835744d2c74f3c52e81e2a477f399f073131ec9778159c4ffab781c8022064855627e8dc03a78bf191b4a5b20aadcab1e2443d099111c015c65909e321ff41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '20310',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e786563056666666666',
            },
            {
                value: '554',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '19301',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: 'f9be89500f2b6baabf00d40c0ff4d8fb7c574085bb6007826f40c72df6971669',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770615,
            hash: '00000000000000000080281e58b1c8bae3ec951480137095882e95232f666709',
            timestamp: '1671199014',
        },
        timeFirstSeen: '1671198719',
        size: 252,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
                    outIdx: 2,
                },
                inputScript:
                    '4730440220081a1344141a454f297c64eaef533045374c8416835ef8c52cb5e6670df27cda02204d40a155e57bac442c85f3c91328c6acc4fe22738fb73041e3ecb7c23b3fbd5841210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '21318',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e78656306636f6f6c696f',
            },
            {
                value: '553',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '20310',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: 'bb66ef4c5782f19015b974300c543d3899586ef7f95e988913196fc7db9629da',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770459,
            hash: '0000000000000000103ba3de40714b256f6f9b56f46613b43141a2dea984315e',
            timestamp: '1671112386',
        },
        timeFirstSeen: '1671111338',
        size: 252,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c1dce1385c8185c5a058b3679966a1b68f7f8e0c74ac3c03c11870e8dfe4ce3d022016f3574a846b12ffc440528263a0139d170527dd2efdb46ae643dd30b3da969741210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '22329',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e78656303666f6f',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '21318',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '051e293de9b61292ae46ed9570fc2d05f169a0372a7bbf7069d3c86afa5f0781',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770452,
            hash: '0000000000000000110940de16f07da16b7a5441694d2a5ace3e8faa7e04fc4e',
            timestamp: '1671109291',
        },
        timeFirstSeen: '1671108616',
        size: 250,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'fe9ae60ad1d947dfe041499b8f56b902779374fb2fb6662f91d5683c4c3ddb8b',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100fad2532abe7c1e2b57ebdbee0a43c4176f6f3389c27b178cb6b27a89fc607a2b02200276ab355eb99f0a6943e4551b2010ddf97b2afe25774b061140d62cd38b42d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100a245067515681caacf1d6da90a8cc4964f0e6282e32325149a6ae7e5c6ae70ed02204bb213450b3f7bbf0a38ba045936157481261e8709c464f092e925ac4a1ee33f41210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '23087',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a0400746162042e786563036e6673',
            },
            {
                value: '556',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '22329',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '4a0ac372d9edfbc88c908a1f477b2414461fbe2ec729d19710b0a6871ab95dba',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770452,
            hash: '0000000000000000110940de16f07da16b7a5441694d2a5ace3e8faa7e04fc4e',
            timestamp: '1671109291',
        },
        timeFirstSeen: '1671108282',
        size: 398,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '03bc75198ecd0491faed1cd03e14c97bd9ec205f4ecf0f6b239a538f5f0d8479',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1cc67f99c0da539449a9bb9f2ded3340d8de169115e8484562c8492159ad59d6',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ad8dc3a6eaefbcdcceca15474c826e7454759f3f55c12af30e8b4ccdd66fe13f02204bbd62e3865499366f22063c34b471148679f82a88f3d4b66bd1395eccf2997941210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '550',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'd826198de42c449731961fd4ba81b3d8b36a49ab85cd6bb846adf9bd8f460a90',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221009a585d7a20e87f0b7a123c3674fabd6fd2907d50b6a0adfef705a62466b5737502202b540834f20b70c26f56df096044780254b14d5b4c7ed44e3e172c934a3b38d041210260dbd59a80d14b548c68772328fa7afc8f2ea25f6c2a9cce13f9cba77199e0de',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                value: '78689',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a040074616205657468616e',
            },
            {
                value: '55400',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
            },
            {
                value: '23087',
                outputScript:
                    '76a914f627e51001a51a1a92d8927808701373cf29267f88ac',
                spentBy: {
                    txid: '363de571114fca54a7a7ef6fba7338f0d55ebe364d90c1fca44594f9e48c7b95',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 770450,
            hash: '00000000000000000fe787306e26f0f28f7d1b46c4888890fc84537dde647f1c',
            timestamp: '1671107720',
        },
        timeFirstSeen: '1671107230',
        size: 395,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockTxHistoryOfAllAddresses = [
    {
        txs: [
            {
                txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022024a187f6dc32082e765eeb37e1a6726e99871b3df0c385ad135ddcf73df0e79102203b81d7eb112a193e23147974432bb12116d75e995aa8c3b6a51943cc4dbd8694412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12214100',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010747454e4553495303434b410d4368726f6e696b20416c7068611468747470733a2f2f636173687461622e636f6d2f4c0001084c000800000014b230ce38',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '88888888888',
                            isMintBaton: false,
                        },
                        spentBy: {
                            txid: 'a83257b2facf7c6d4f8df9a307dee9cc79af9323b8bb803994d5c967bf916569',
                            outIdx: 1,
                        },
                    },
                    {
                        value: '12213031',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '5fc6f53ef0f94e66d5f6983402441cfdece1dbd35bd500b6e15881d1b37aa93f',
                            outIdx: 67,
                        },
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'GENESIS',
                        tokenId:
                            '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                    },
                    genesisInfo: {
                        tokenTicker: 'CKA',
                        tokenName: 'Chronik Alpha',
                        tokenDocumentUrl: 'https://cashtab.com/',
                        tokenDocumentHash: '',
                        decimals: 8,
                    },
                },
                block: {
                    height: 757174,
                    hash: '000000000000000011c5e064ac6295bb1c1e1c306019e591b9c79290c24c33ff',
                    timestamp: '1663091856',
                },
                timeFirstSeen: '1663091668',
                size: 304,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                            outIdx: 3,
                        },
                        inputScript:
                            '47304402201623de13a2cd38d379a08dbee1cb2239571b6166bf9923ffe44ae108fd21931c022030dcd5b08a997dcaa7af505a5e513985317b2da91d2f4d4879ee941e3b8931ad412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12218055',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04657461624c910458f886baf61daf6fa1909aab79e30bca8d35d634c6c5e969b2157b87e67fa010252a9fd1eebeed00075d0fb7bcc0dcb73b41cc73adacdae2be18d31643ad3f33d95f9a97e7cf00b2231fd0a7d37f36d082c86a392bde59eac693c002f861082d7d3cbc23eafd4511afe3619bfc0f0c028454038dee71a6e7796395574b9a06b9bf7aaf0cd607e59f4ad641393d746f88',
                    },
                    {
                        value: '3500',
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: '12214100',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 757171,
                    hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
                    timestamp: '1663090626',
                },
                timeFirstSeen: '1663089642',
                size: 387,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402202267233e578abb21efa28bc606501f582f94915d3b07ceedff39750877c7211d02206cfec78f41fe58723938c199fa908f4e13ebb298cc989be30faa1e6838c22af1412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12224078',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04007461621c54657374696e67206d756c74692d73656e642077697468206e6f7465',
                    },
                    {
                        value: '2200',
                        outputScript:
                            '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    },
                    {
                        value: '3300',
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: '12218055',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 757171,
                    hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
                    timestamp: '1663090626',
                },
                timeFirstSeen: '1663089621',
                size: 303,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100f3e4140c8f1614612c07ffe4d35e697d5ffd0931d7b18b9360f5f431c6704d11022002b5fd03e7f9b849fec1c0374dc3df2f1f2dae333980bd02aaa3710b66d1eb0e412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12230101',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '3300',
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: '2200',
                        outputScript:
                            '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    },
                    {
                        value: '12224078',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 757171,
                    hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
                    timestamp: '1663090626',
                },
                timeFirstSeen: '1663089593',
                size: 260,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                            outIdx: 2,
                        },
                        inputScript:
                            '4830450221008f8052c8b78a4d250f4596b3a14c85fb2d253ce20d972422829dc4a68a87320702202b7d272a96996bab1914f693939dfc6300184f5f3db0acc5acfc155ba19d7642412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12233856',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '3300',
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: '12230101',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 757171,
                    hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
                    timestamp: '1663090626',
                },
                timeFirstSeen: '1663089364',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                            outIdx: 1,
                        },
                        inputScript:
                            '473044022038c75f93d7abe8e6e63c0981203acd48c7e6df92ba52cc9399df84b0b367ee200220356508913a5f8ad94d126891fea372bb2bf66a249bdb63332a4625cb359865f8412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12235011',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript: '6a04007461620454657374',
                    },
                    {
                        value: '700',
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: '12233856',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 755309,
                    hash: '0000000000000000115c75e7b0728b548e9f21bb9ebdcad68d36475e712ceed5',
                    timestamp: '1661972428',
                },
                timeFirstSeen: '1661972247',
                size: 245,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100f288e71276e2389744ecb3c98bdf0c119d19966ac086c5f5908f8c3a878aa7e402203c07905536720391f472457f52f5cf6aaeb4fa02fdf59722f25768a36fd6157f412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12243166',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '7700',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        spentBy: {
                            txid: '04eedd3f4b4dc9727e393ad3e774f2dc0c6acf9e920dc6fcbcbf95ed9b98477c',
                            outIdx: 3,
                        },
                    },
                    {
                        value: '12235011',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 743257,
                    hash: '000000000000000013259e217a18907ba956c55f839b6b15a11a79a2bf303d9f',
                    timestamp: '1654812393',
                },
                timeFirstSeen: '0',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100d541ef12cc57c3b3cc95b338aec21775b27441d12eda662dcff23a46d07cc9450220467d2aae0dadcae787db33dab6adc86ec47aafea0133cc2130a62bb8247491d6412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '14743621',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '2500000',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '55388f67ab1b23d2e6c146472b836c1ba1df33dd9b7685bed34c6c9ce6fe5c0e',
                            outIdx: 0,
                        },
                    },
                    {
                        value: '12243166',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 742800,
                    hash: '000000000000000009e1ed934f027563d161d1f59a00253496b0c847c2288c38',
                    timestamp: '1654543720',
                },
                timeFirstSeen: '0',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '41e306829bca85422ac5cbf2baad3d1a4e79c3bbb8f042cf0aa7ae2df49535a5',
                            outIdx: 1,
                        },
                        inputScript:
                            '473044022046faa2cc8efc0a06b2cfa8b80b658d4dc09bc1524cba1cb4ab456f8bc9ebf37902205074d7975824a06d6cba90dc91503f29801d9c180253bbe4ecefb42ddc82da6d412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '14746276',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04657461624c810406fe30e60d38c4408043ca5b43cd515db4b10af477007962db6d019eeb9c3f6734c495574368da107bb00b32a27d096069706a0fb91fe18d0d8281c1b826fdd862a1955dd0d28b4e0245c862085f172d3947ca202953095ed014258f069c4d3fc36706e842b6643061e4ce70b91fb5b5b206de4d3b81a621ad9d4456c3f0cf6b',
                    },
                    {
                        value: '2200',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '31e5bf25b892e173483c7b100a5b0fcda03cac9337c335fda3b3a5cf17b64759',
                            outIdx: 0,
                        },
                    },
                    {
                        value: '14743621',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 741058,
                    hash: '00000000000000000bb6dc63cd48a9b0dcf37a9b722618209dc85a79e8dc7973',
                    timestamp: '1653506978',
                },
                timeFirstSeen: '0',
                size: 371,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: '41e306829bca85422ac5cbf2baad3d1a4e79c3bbb8f042cf0aa7ae2df49535a5',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '63a11be653e333ae3e1075791c996d46b5f476b483c4ccf4ec33b524028d7cd5',
                            outIdx: 1,
                        },
                        inputScript:
                            '47304402204c6140c524e40653e85440aff615af47a481accc9dc8b45548d59a3ae91d3a0802200aa1667d00b16d3a80c5d4d1b4cabeee415289ef6818496f92abf9ec2db8262c412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '14748931',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '2200',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '46158de814d73ded1a8f91221c85d9c91c696eaf14f0bd10e6fa7215bacf7852',
                            outIdx: 1,
                        },
                    },
                    {
                        value: '14746276',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 739747,
                    hash: '0000000000000000079aa77192cf335b2004788c2860be98c310a5187a588dd3',
                    timestamp: '1652722196',
                },
                timeFirstSeen: '0',
                size: 225,
                isCoinbase: false,
                network: 'XEC',
            },
        ],
        numPages: 2,
    },
    {
        txs: [],
        numPages: 0,
    },
    {
        txs: [
            {
                txid: '09033290a18b5c3054dbb6df8b6ad5c3e2bc121ab4cb2a91f79cedb36f05a2ef',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'c0ab154992174fc86381540dbf016d64c4e218a07aec7d5734a841ccbab93e1c',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100f50735a67538602ec240725f9160bdfc96b4ae443fff2cebaf25485e8f98f5720220584ab745222cc7a0cd33d6f287885781b8009bc1e819b9b97436ecdb31abeff2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '49545',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1300',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        value: '47790',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758570,
                    hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
                    timestamp: '1663956316',
                },
                timeFirstSeen: '1663956020',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: 'daf142f1f90dc81efeafb94f986b951ff3bae6fb155565d96fd091e34e61ee29',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '5b679c422abc750576c188e3ed0729fb0e452f6ae0a8ad118026755fbceb00b1',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100ac91ae0c612165e500605ae41080a30be891ef757c378733bfe5533f331d0e97022020babc7d6a267fc5fbab8ba9740968732978abf4cf63e049721c008532204bf8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '47562',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1200',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        value: '45907',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758570,
                    hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
                    timestamp: '1663956316',
                },
                timeFirstSeen: '1663956011',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: '376593dc3d3e305843fe23692e1477ae13ae1e8bfc778273c544a0c5d6285337',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '930259a2fe4de56a15ab33d5f2b13bfd08568c3d662df6b1a3c090a19aab8104',
                            outIdx: 0,
                        },
                        inputScript:
                            '48304502210086a6072eaabb3502c73cbb6701c04edca374de60d62b888614d76b352203e9d602205721cec95da5a0ceda4cf54bf4bf8f54bec3d07b1caa75e1d65a87d8b5572f0f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '3300',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1100',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        value: '1745',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758570,
                    hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
                    timestamp: '1663956316',
                },
                timeFirstSeen: '1663956003',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: '2faa94a50ddffc795f6044214efbca0d0190ed520e7e0fd35c4623ecd64b4e45',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '08ac32dc47252668cd32dbe0d9af15d1ae9e282ae56c3743a258d11613105924',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402207031eafbfb4f762f1eb719defa8cb890f55085c593244eecce57082b7013fd4f02205178c40c57903baa3d9ebf554d2f3892859599b6e358e10725db81c14de4c80f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '34',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '5',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        slpToken: {
                            amount: '29',
                            isMintBaton: false,
                        },
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
                block: {
                    height: 758570,
                    hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
                    timestamp: '1663956316',
                },
                timeFirstSeen: '1663955995',
                size: 445,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: '050705e14d2d27e1cb59127617d54a5cccd91c4cad6ffe8c2c6eb684e9d76042',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'a429b818424b74153b363e487a577142f4e9bd67530739ed6883d8a6d71ea947',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100f4734cb1a5e7a64013b5408b9d0d6bc59560b08b9e7284f8bbba217f777f772c02204625fab8a1356f96f00a463be8aa64e90f663744554df60807d1aa1e00d19c5e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '1100',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'e9c384cc569ad83d4fc61a54cac405ff2d64a5f532d94006bc38b87296c6bf63',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100892a72b025cd5cd667bace86dfc605169018d9b46fa9ba2ef963e4dbe26a471702201283b63ebe679be3c27edc7b37aff829ba34503430147e203661d4d4ec4f14a5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '7700',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '7a197add9eb4a57d854aaf31dd12fd71a806e4ba4fb4bf23ed7097cd281faae2',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402203bcfcdbd76587aaa0b525edec82a5078daef892a98ae76d39accf1d874bd526d02202e2eba394d27b82c54fd3605ebafe7d6c9d2e7fa5dc769a4dc113dfbf5025a9d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '126',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000108000000000000007d',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '1',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        slpToken: {
                            amount: '125',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '6655',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
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
                block: {
                    height: 758569,
                    hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
                    timestamp: '1663955917',
                },
                timeFirstSeen: '1663955725',
                size: 628,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: 'c66b09f5c6b2afa5c63ff7c2ca2cc8d9538568a18c75b0e7d900c9c1be2758f7',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '43beeeeb761c401a1d121840e87c86237c98e9310e889feb0a34426e2a1ee463',
                            outIdx: 0,
                        },
                        inputScript:
                            '4730440220606efba360bf0843f8c3fe9fab7d1cdc34852395b9045a4c3cf8f27b91d414f2022054fb11ce6e4fd2ee50ba467e94460c63e45fb563e330fc35c5caa8eea71e93b7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '3300',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1900',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        value: '945',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758569,
                    hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
                    timestamp: '1663955917',
                },
                timeFirstSeen: '1663955710',
                size: 225,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: '96c9031e30dba075dd83f622ed952ef7bb75fe12abdad962e70e9904272a7532',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '08cb593e2b2d0a47649990591bf30eee51534f85658fc8ee4e98e12e1c5c5553',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402204569cce381885918e300caef1e8a5388b86be871ff3e8f8f52917c26df9dde760220474e3ce3f6363a826d2772e347c296773ea838f493882e15fdc6a5181286a92c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '1700',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'cb68f53c0e46ab2ec0ceb28d87aa5b8b8a059c72b3c1f977141760d8dc93c821',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402206355208bd3eae6d3468a062a6cc33340cd82e0e5def4dad1efa7caee652b21b40220619f05019e5014f1154659bbf5a46f4abbf93e04eecca8c509d231eb2a495f41412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '3300',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1800',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        value: '2448',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758569,
                    hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
                    timestamp: '1663955917',
                },
                timeFirstSeen: '1663955701',
                size: 372,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: 'c25516f6d82e4299849edbd730ecb55b2b0e4745d95735b43bb4d16a67f50113',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'a737c1372586cf30d76d8bdcac8e96e2c321f667a77ec4bb9980e603e2a77b3d',
                            outIdx: 0,
                        },
                        inputScript:
                            '4730440220665f4bf3d94204649f8a1731285eb6e94940e38a3601504612374ec0a06ff27f02206276844772b498726e3e56145d42f2316da5646619d8288598f18e828426881f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1700',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758569,
                    hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
                    timestamp: '1663955917',
                },
                timeFirstSeen: '1663955694',
                size: 191,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: 'de5c518dc2d3d52268c3aeb788134ac373553b2eb239f256fa463c728af87189',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '0c67c0b670378c6ae959172eefd099247be944cdb88108d52589731f2194d675',
                            outIdx: 5,
                        },
                        inputScript:
                            '47304402204b4de25ffee112642136a6d1ad74394c7bfb984a08703d5362500a5521d346dc022053c3e887d7bb27a2525140789a7f450b0995781787ce28750dca1421b746721f412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '43783281',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100d4d1566db73386cd9580ff6f2c60e1536993b459fb3b199d7514fbd6fb5042ca0220590e88aa183ed6a756fbb8d8ba4bf5133f578746a917fab1e1b8e712543c5861412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpBurn: {
                            token: {
                                amount: '1',
                                isMintBaton: false,
                            },
                            tokenId:
                                '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                        },
                        slpToken: {
                            amount: '100',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e44203515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9080000000000000063',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '99',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '43781463',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    },
                },
                block: {
                    height: 758551,
                    hash: '000000000000000004ac3b44419bb5f0e0b47937b3e7e781206270da01b4a53e',
                    timestamp: '1663947923',
                },
                timeFirstSeen: '1663947876',
                size: 437,
                isCoinbase: false,
                network: 'XEC',
            },
            {
                txid: 'd34f524ca0509e83718516ce697eeed5452ea0e312bab50ce0172589275fdd84',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '696265ced15b8fdbacfa1a4f5e779575ff5faaf3ff4ad09e5691b2ed4cf50a84',
                            outIdx: 3,
                        },
                        inputScript:
                            '483045022100e43086bb67006f6d5140a3329001bc53dabe2da4dbe7feae34dd5f10311b15ad022045da448bc99003af6cf6d4c74ec9891c60932013dde7451abca4a6bc40b6138d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '10409988',
                        sequenceNo: 4294967295,
                        slpBurn: {
                            token: {
                                amount: '0',
                                isMintBaton: false,
                            },
                            tokenId:
                                'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04657461624ca104acd46779fb7a9a8e24656ba7ffcbc066bb78701630b0a3fd1c36a3e2b605d78e1d995ea990096a3f76077985d2194fd1a87369921545a544992c86414ed859247ab8f9c2979ed9b8fecb2cfaa7ff74f1daf6f7c00f3d97a5b942aecba54bf155d464606b6faa6f5efcbdf3f525b3283acf6867d11cfc30623c3107a87b499f68ca00602492c9cdca9b481c7f2b65a6ecd481bfdd244954b32a45c658592182ad',
                    },
                    {
                        value: '1200',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        value: '10408333',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758550,
                    hash: '000000000000000009f8cdae9bb21a321896126e06413a4e8af24a182edf701e',
                    timestamp: '1663947819',
                },
                timeFirstSeen: '1663946739',
                size: 404,
                isCoinbase: false,
                network: 'XEC',
            },
        ],
        numPages: 98,
    },
];

export const mockFlatTxHistoryNoUnconfirmed = [
    {
        txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                    outIdx: 2,
                },
                inputScript:
                    '473044022024a187f6dc32082e765eeb37e1a6726e99871b3df0c385ad135ddcf73df0e79102203b81d7eb112a193e23147974432bb12116d75e995aa8c3b6a51943cc4dbd8694412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12214100',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010747454e4553495303434b410d4368726f6e696b20416c7068611468747470733a2f2f636173687461622e636f6d2f4c0001084c000800000014b230ce38',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '88888888888',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: 'a83257b2facf7c6d4f8df9a307dee9cc79af9323b8bb803994d5c967bf916569',
                    outIdx: 1,
                },
            },
            {
                value: '12213031',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '5fc6f53ef0f94e66d5f6983402441cfdece1dbd35bd500b6e15881d1b37aa93f',
                    outIdx: 67,
                },
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'GENESIS',
                tokenId:
                    '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
            },
            genesisInfo: {
                tokenTicker: 'CKA',
                tokenName: 'Chronik Alpha',
                tokenDocumentUrl: 'https://cashtab.com/',
                tokenDocumentHash: '',
                decimals: 8,
            },
        },
        block: {
            height: 757174,
            hash: '000000000000000011c5e064ac6295bb1c1e1c306019e591b9c79290c24c33ff',
            timestamp: '1663091856',
        },
        timeFirstSeen: '1663091668',
        size: 304,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                    outIdx: 3,
                },
                inputScript:
                    '47304402201623de13a2cd38d379a08dbee1cb2239571b6166bf9923ffe44ae108fd21931c022030dcd5b08a997dcaa7af505a5e513985317b2da91d2f4d4879ee941e3b8931ad412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12218055',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04657461624c910458f886baf61daf6fa1909aab79e30bca8d35d634c6c5e969b2157b87e67fa010252a9fd1eebeed00075d0fb7bcc0dcb73b41cc73adacdae2be18d31643ad3f33d95f9a97e7cf00b2231fd0a7d37f36d082c86a392bde59eac693c002f861082d7d3cbc23eafd4511afe3619bfc0f0c028454038dee71a6e7796395574b9a06b9bf7aaf0cd607e59f4ad641393d746f88',
            },
            {
                value: '3500',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '12214100',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: '1663090626',
        },
        timeFirstSeen: '1663089642',
        size: 387,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                    outIdx: 2,
                },
                inputScript:
                    '47304402202267233e578abb21efa28bc606501f582f94915d3b07ceedff39750877c7211d02206cfec78f41fe58723938c199fa908f4e13ebb298cc989be30faa1e6838c22af1412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12224078',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04007461621c54657374696e67206d756c74692d73656e642077697468206e6f7465',
            },
            {
                value: '2200',
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
            {
                value: '3300',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '12218055',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: '1663090626',
        },
        timeFirstSeen: '1663089621',
        size: 303,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f3e4140c8f1614612c07ffe4d35e697d5ffd0931d7b18b9360f5f431c6704d11022002b5fd03e7f9b849fec1c0374dc3df2f1f2dae333980bd02aaa3710b66d1eb0e412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12230101',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '3300',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '2200',
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
            {
                value: '12224078',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: '1663090626',
        },
        timeFirstSeen: '1663089593',
        size: 260,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221008f8052c8b78a4d250f4596b3a14c85fb2d253ce20d972422829dc4a68a87320702202b7d272a96996bab1914f693939dfc6300184f5f3db0acc5acfc155ba19d7642412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12233856',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '3300',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '12230101',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: '1663090626',
        },
        timeFirstSeen: '1663089364',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                    outIdx: 1,
                },
                inputScript:
                    '473044022038c75f93d7abe8e6e63c0981203acd48c7e6df92ba52cc9399df84b0b367ee200220356508913a5f8ad94d126891fea372bb2bf66a249bdb63332a4625cb359865f8412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12235011',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a04007461620454657374',
            },
            {
                value: '700',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '12233856',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 755309,
            hash: '0000000000000000115c75e7b0728b548e9f21bb9ebdcad68d36475e712ceed5',
            timestamp: '1661972428',
        },
        timeFirstSeen: '1661972247',
        size: 245,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f288e71276e2389744ecb3c98bdf0c119d19966ac086c5f5908f8c3a878aa7e402203c07905536720391f472457f52f5cf6aaeb4fa02fdf59722f25768a36fd6157f412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12243166',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '7700',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                spentBy: {
                    txid: '04eedd3f4b4dc9727e393ad3e774f2dc0c6acf9e920dc6fcbcbf95ed9b98477c',
                    outIdx: 3,
                },
            },
            {
                value: '12235011',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 743257,
            hash: '000000000000000013259e217a18907ba956c55f839b6b15a11a79a2bf303d9f',
            timestamp: '1654812393',
        },
        timeFirstSeen: '0',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100d541ef12cc57c3b3cc95b338aec21775b27441d12eda662dcff23a46d07cc9450220467d2aae0dadcae787db33dab6adc86ec47aafea0133cc2130a62bb8247491d6412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '14743621',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2500000',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '55388f67ab1b23d2e6c146472b836c1ba1df33dd9b7685bed34c6c9ce6fe5c0e',
                    outIdx: 0,
                },
            },
            {
                value: '12243166',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 742800,
            hash: '000000000000000009e1ed934f027563d161d1f59a00253496b0c847c2288c38',
            timestamp: '1654543720',
        },
        timeFirstSeen: '0',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '41e306829bca85422ac5cbf2baad3d1a4e79c3bbb8f042cf0aa7ae2df49535a5',
                    outIdx: 1,
                },
                inputScript:
                    '473044022046faa2cc8efc0a06b2cfa8b80b658d4dc09bc1524cba1cb4ab456f8bc9ebf37902205074d7975824a06d6cba90dc91503f29801d9c180253bbe4ecefb42ddc82da6d412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '14746276',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04657461624c810406fe30e60d38c4408043ca5b43cd515db4b10af477007962db6d019eeb9c3f6734c495574368da107bb00b32a27d096069706a0fb91fe18d0d8281c1b826fdd862a1955dd0d28b4e0245c862085f172d3947ca202953095ed014258f069c4d3fc36706e842b6643061e4ce70b91fb5b5b206de4d3b81a621ad9d4456c3f0cf6b',
            },
            {
                value: '2200',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '31e5bf25b892e173483c7b100a5b0fcda03cac9337c335fda3b3a5cf17b64759',
                    outIdx: 0,
                },
            },
            {
                value: '14743621',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 741058,
            hash: '00000000000000000bb6dc63cd48a9b0dcf37a9b722618209dc85a79e8dc7973',
            timestamp: '1653506978',
        },
        timeFirstSeen: '0',
        size: 371,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '41e306829bca85422ac5cbf2baad3d1a4e79c3bbb8f042cf0aa7ae2df49535a5',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '63a11be653e333ae3e1075791c996d46b5f476b483c4ccf4ec33b524028d7cd5',
                    outIdx: 1,
                },
                inputScript:
                    '47304402204c6140c524e40653e85440aff615af47a481accc9dc8b45548d59a3ae91d3a0802200aa1667d00b16d3a80c5d4d1b4cabeee415289ef6818496f92abf9ec2db8262c412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '14748931',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2200',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '46158de814d73ded1a8f91221c85d9c91c696eaf14f0bd10e6fa7215bacf7852',
                    outIdx: 1,
                },
            },
            {
                value: '14746276',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 739747,
            hash: '0000000000000000079aa77192cf335b2004788c2860be98c310a5187a588dd3',
            timestamp: '1652722196',
        },
        timeFirstSeen: '0',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '09033290a18b5c3054dbb6df8b6ad5c3e2bc121ab4cb2a91f79cedb36f05a2ef',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c0ab154992174fc86381540dbf016d64c4e218a07aec7d5734a841ccbab93e1c',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f50735a67538602ec240725f9160bdfc96b4ae443fff2cebaf25485e8f98f5720220584ab745222cc7a0cd33d6f287885781b8009bc1e819b9b97436ecdb31abeff2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '49545',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1300',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '47790',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663956020',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'daf142f1f90dc81efeafb94f986b951ff3bae6fb155565d96fd091e34e61ee29',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5b679c422abc750576c188e3ed0729fb0e452f6ae0a8ad118026755fbceb00b1',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ac91ae0c612165e500605ae41080a30be891ef757c378733bfe5533f331d0e97022020babc7d6a267fc5fbab8ba9740968732978abf4cf63e049721c008532204bf8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '47562',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1200',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '45907',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663956011',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '376593dc3d3e305843fe23692e1477ae13ae1e8bfc778273c544a0c5d6285337',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '930259a2fe4de56a15ab33d5f2b13bfd08568c3d662df6b1a3c090a19aab8104',
                    outIdx: 0,
                },
                inputScript:
                    '48304502210086a6072eaabb3502c73cbb6701c04edca374de60d62b888614d76b352203e9d602205721cec95da5a0ceda4cf54bf4bf8f54bec3d07b1caa75e1d65a87d8b5572f0f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1100',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '1745',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663956003',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '2faa94a50ddffc795f6044214efbca0d0190ed520e7e0fd35c4623ecd64b4e45',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '08ac32dc47252668cd32dbe0d9af15d1ae9e282ae56c3743a258d11613105924',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207031eafbfb4f762f1eb719defa8cb890f55085c593244eecce57082b7013fd4f02205178c40c57903baa3d9ebf554d2f3892859599b6e358e10725db81c14de4c80f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                    outIdx: 2,
                },
                inputScript:
                    '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '34',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '5',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '29',
                    isMintBaton: false,
                },
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
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663955995',
        size: 445,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '050705e14d2d27e1cb59127617d54a5cccd91c4cad6ffe8c2c6eb684e9d76042',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'a429b818424b74153b363e487a577142f4e9bd67530739ed6883d8a6d71ea947',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f4734cb1a5e7a64013b5408b9d0d6bc59560b08b9e7284f8bbba217f777f772c02204625fab8a1356f96f00a463be8aa64e90f663744554df60807d1aa1e00d19c5e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1100',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'e9c384cc569ad83d4fc61a54cac405ff2d64a5f532d94006bc38b87296c6bf63',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100892a72b025cd5cd667bace86dfc605169018d9b46fa9ba2ef963e4dbe26a471702201283b63ebe679be3c27edc7b37aff829ba34503430147e203661d4d4ec4f14a5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '7700',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '7a197add9eb4a57d854aaf31dd12fd71a806e4ba4fb4bf23ed7097cd281faae2',
                    outIdx: 2,
                },
                inputScript:
                    '47304402203bcfcdbd76587aaa0b525edec82a5078daef892a98ae76d39accf1d874bd526d02202e2eba394d27b82c54fd3605ebafe7d6c9d2e7fa5dc769a4dc113dfbf5025a9d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '126',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000108000000000000007d',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '1',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '125',
                    isMintBaton: false,
                },
            },
            {
                value: '6655',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
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
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: '1663955917',
        },
        timeFirstSeen: '1663955725',
        size: 628,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'c66b09f5c6b2afa5c63ff7c2ca2cc8d9538568a18c75b0e7d900c9c1be2758f7',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '43beeeeb761c401a1d121840e87c86237c98e9310e889feb0a34426e2a1ee463',
                    outIdx: 0,
                },
                inputScript:
                    '4730440220606efba360bf0843f8c3fe9fab7d1cdc34852395b9045a4c3cf8f27b91d414f2022054fb11ce6e4fd2ee50ba467e94460c63e45fb563e330fc35c5caa8eea71e93b7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1900',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '945',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: '1663955917',
        },
        timeFirstSeen: '1663955710',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '96c9031e30dba075dd83f622ed952ef7bb75fe12abdad962e70e9904272a7532',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '08cb593e2b2d0a47649990591bf30eee51534f85658fc8ee4e98e12e1c5c5553',
                    outIdx: 0,
                },
                inputScript:
                    '47304402204569cce381885918e300caef1e8a5388b86be871ff3e8f8f52917c26df9dde760220474e3ce3f6363a826d2772e347c296773ea838f493882e15fdc6a5181286a92c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1700',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'cb68f53c0e46ab2ec0ceb28d87aa5b8b8a059c72b3c1f977141760d8dc93c821',
                    outIdx: 0,
                },
                inputScript:
                    '47304402206355208bd3eae6d3468a062a6cc33340cd82e0e5def4dad1efa7caee652b21b40220619f05019e5014f1154659bbf5a46f4abbf93e04eecca8c509d231eb2a495f41412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1800',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '2448',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: '1663955917',
        },
        timeFirstSeen: '1663955701',
        size: 372,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'c25516f6d82e4299849edbd730ecb55b2b0e4745d95735b43bb4d16a67f50113',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'a737c1372586cf30d76d8bdcac8e96e2c321f667a77ec4bb9980e603e2a77b3d',
                    outIdx: 0,
                },
                inputScript:
                    '4730440220665f4bf3d94204649f8a1731285eb6e94940e38a3601504612374ec0a06ff27f02206276844772b498726e3e56145d42f2316da5646619d8288598f18e828426881f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1700',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: '1663955917',
        },
        timeFirstSeen: '1663955694',
        size: 191,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'de5c518dc2d3d52268c3aeb788134ac373553b2eb239f256fa463c728af87189',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '0c67c0b670378c6ae959172eefd099247be944cdb88108d52589731f2194d675',
                    outIdx: 5,
                },
                inputScript:
                    '47304402204b4de25ffee112642136a6d1ad74394c7bfb984a08703d5362500a5521d346dc022053c3e887d7bb27a2525140789a7f450b0995781787ce28750dca1421b746721f412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '43783281',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100d4d1566db73386cd9580ff6f2c60e1536993b459fb3b199d7514fbd6fb5042ca0220590e88aa183ed6a756fbb8d8ba4bf5133f578746a917fab1e1b8e712543c5861412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '546',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '1',
                        isMintBaton: false,
                    },
                    tokenId:
                        '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                },
                slpToken: {
                    amount: '100',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44203515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9080000000000000063',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '99',
                    isMintBaton: false,
                },
            },
            {
                value: '43781463',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
            },
        },
        block: {
            height: 758551,
            hash: '000000000000000004ac3b44419bb5f0e0b47937b3e7e781206270da01b4a53e',
            timestamp: '1663947923',
        },
        timeFirstSeen: '1663947876',
        size: 437,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'd34f524ca0509e83718516ce697eeed5452ea0e312bab50ce0172589275fdd84',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '696265ced15b8fdbacfa1a4f5e779575ff5faaf3ff4ad09e5691b2ed4cf50a84',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100e43086bb67006f6d5140a3329001bc53dabe2da4dbe7feae34dd5f10311b15ad022045da448bc99003af6cf6d4c74ec9891c60932013dde7451abca4a6bc40b6138d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '10409988',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04657461624ca104acd46779fb7a9a8e24656ba7ffcbc066bb78701630b0a3fd1c36a3e2b605d78e1d995ea990096a3f76077985d2194fd1a87369921545a544992c86414ed859247ab8f9c2979ed9b8fecb2cfaa7ff74f1daf6f7c00f3d97a5b942aecba54bf155d464606b6faa6f5efcbdf3f525b3283acf6867d11cfc30623c3107a87b499f68ca00602492c9cdca9b481c7f2b65a6ecd481bfdd244954b32a45c658592182ad',
            },
            {
                value: '1200',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                value: '10408333',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758550,
            hash: '000000000000000009f8cdae9bb21a321896126e06413a4e8af24a182edf701e',
            timestamp: '1663947819',
        },
        timeFirstSeen: '1663946739',
        size: 404,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockSortedTxHistoryNoUnconfirmed = [
    {
        txid: '09033290a18b5c3054dbb6df8b6ad5c3e2bc121ab4cb2a91f79cedb36f05a2ef',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c0ab154992174fc86381540dbf016d64c4e218a07aec7d5734a841ccbab93e1c',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f50735a67538602ec240725f9160bdfc96b4ae443fff2cebaf25485e8f98f5720220584ab745222cc7a0cd33d6f287885781b8009bc1e819b9b97436ecdb31abeff2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '49545',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1300',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '47790',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663956020',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'daf142f1f90dc81efeafb94f986b951ff3bae6fb155565d96fd091e34e61ee29',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5b679c422abc750576c188e3ed0729fb0e452f6ae0a8ad118026755fbceb00b1',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ac91ae0c612165e500605ae41080a30be891ef757c378733bfe5533f331d0e97022020babc7d6a267fc5fbab8ba9740968732978abf4cf63e049721c008532204bf8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '47562',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1200',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '45907',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663956011',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '376593dc3d3e305843fe23692e1477ae13ae1e8bfc778273c544a0c5d6285337',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '930259a2fe4de56a15ab33d5f2b13bfd08568c3d662df6b1a3c090a19aab8104',
                    outIdx: 0,
                },
                inputScript:
                    '48304502210086a6072eaabb3502c73cbb6701c04edca374de60d62b888614d76b352203e9d602205721cec95da5a0ceda4cf54bf4bf8f54bec3d07b1caa75e1d65a87d8b5572f0f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1100',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '1745',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663956003',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '2faa94a50ddffc795f6044214efbca0d0190ed520e7e0fd35c4623ecd64b4e45',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '08ac32dc47252668cd32dbe0d9af15d1ae9e282ae56c3743a258d11613105924',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207031eafbfb4f762f1eb719defa8cb890f55085c593244eecce57082b7013fd4f02205178c40c57903baa3d9ebf554d2f3892859599b6e358e10725db81c14de4c80f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                    outIdx: 2,
                },
                inputScript:
                    '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '34',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '5',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '29',
                    isMintBaton: false,
                },
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
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663955995',
        size: 445,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '050705e14d2d27e1cb59127617d54a5cccd91c4cad6ffe8c2c6eb684e9d76042',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'a429b818424b74153b363e487a577142f4e9bd67530739ed6883d8a6d71ea947',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f4734cb1a5e7a64013b5408b9d0d6bc59560b08b9e7284f8bbba217f777f772c02204625fab8a1356f96f00a463be8aa64e90f663744554df60807d1aa1e00d19c5e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1100',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'e9c384cc569ad83d4fc61a54cac405ff2d64a5f532d94006bc38b87296c6bf63',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100892a72b025cd5cd667bace86dfc605169018d9b46fa9ba2ef963e4dbe26a471702201283b63ebe679be3c27edc7b37aff829ba34503430147e203661d4d4ec4f14a5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '7700',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '7a197add9eb4a57d854aaf31dd12fd71a806e4ba4fb4bf23ed7097cd281faae2',
                    outIdx: 2,
                },
                inputScript:
                    '47304402203bcfcdbd76587aaa0b525edec82a5078daef892a98ae76d39accf1d874bd526d02202e2eba394d27b82c54fd3605ebafe7d6c9d2e7fa5dc769a4dc113dfbf5025a9d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '126',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000108000000000000007d',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '1',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '125',
                    isMintBaton: false,
                },
            },
            {
                value: '6655',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
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
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: '1663955917',
        },
        timeFirstSeen: '1663955725',
        size: 628,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'c66b09f5c6b2afa5c63ff7c2ca2cc8d9538568a18c75b0e7d900c9c1be2758f7',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '43beeeeb761c401a1d121840e87c86237c98e9310e889feb0a34426e2a1ee463',
                    outIdx: 0,
                },
                inputScript:
                    '4730440220606efba360bf0843f8c3fe9fab7d1cdc34852395b9045a4c3cf8f27b91d414f2022054fb11ce6e4fd2ee50ba467e94460c63e45fb563e330fc35c5caa8eea71e93b7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1900',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '945',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: '1663955917',
        },
        timeFirstSeen: '1663955710',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '96c9031e30dba075dd83f622ed952ef7bb75fe12abdad962e70e9904272a7532',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '08cb593e2b2d0a47649990591bf30eee51534f85658fc8ee4e98e12e1c5c5553',
                    outIdx: 0,
                },
                inputScript:
                    '47304402204569cce381885918e300caef1e8a5388b86be871ff3e8f8f52917c26df9dde760220474e3ce3f6363a826d2772e347c296773ea838f493882e15fdc6a5181286a92c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1700',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'cb68f53c0e46ab2ec0ceb28d87aa5b8b8a059c72b3c1f977141760d8dc93c821',
                    outIdx: 0,
                },
                inputScript:
                    '47304402206355208bd3eae6d3468a062a6cc33340cd82e0e5def4dad1efa7caee652b21b40220619f05019e5014f1154659bbf5a46f4abbf93e04eecca8c509d231eb2a495f41412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1800',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '2448',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: '1663955917',
        },
        timeFirstSeen: '1663955701',
        size: 372,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'c25516f6d82e4299849edbd730ecb55b2b0e4745d95735b43bb4d16a67f50113',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'a737c1372586cf30d76d8bdcac8e96e2c321f667a77ec4bb9980e603e2a77b3d',
                    outIdx: 0,
                },
                inputScript:
                    '4730440220665f4bf3d94204649f8a1731285eb6e94940e38a3601504612374ec0a06ff27f02206276844772b498726e3e56145d42f2316da5646619d8288598f18e828426881f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1700',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: '1663955917',
        },
        timeFirstSeen: '1663955694',
        size: 191,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'de5c518dc2d3d52268c3aeb788134ac373553b2eb239f256fa463c728af87189',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '0c67c0b670378c6ae959172eefd099247be944cdb88108d52589731f2194d675',
                    outIdx: 5,
                },
                inputScript:
                    '47304402204b4de25ffee112642136a6d1ad74394c7bfb984a08703d5362500a5521d346dc022053c3e887d7bb27a2525140789a7f450b0995781787ce28750dca1421b746721f412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '43783281',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100d4d1566db73386cd9580ff6f2c60e1536993b459fb3b199d7514fbd6fb5042ca0220590e88aa183ed6a756fbb8d8ba4bf5133f578746a917fab1e1b8e712543c5861412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '546',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '1',
                        isMintBaton: false,
                    },
                    tokenId:
                        '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                },
                slpToken: {
                    amount: '100',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44203515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9080000000000000063',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '99',
                    isMintBaton: false,
                },
            },
            {
                value: '43781463',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
            },
        },
        block: {
            height: 758551,
            hash: '000000000000000004ac3b44419bb5f0e0b47937b3e7e781206270da01b4a53e',
            timestamp: '1663947923',
        },
        timeFirstSeen: '1663947876',
        size: 437,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'd34f524ca0509e83718516ce697eeed5452ea0e312bab50ce0172589275fdd84',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '696265ced15b8fdbacfa1a4f5e779575ff5faaf3ff4ad09e5691b2ed4cf50a84',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100e43086bb67006f6d5140a3329001bc53dabe2da4dbe7feae34dd5f10311b15ad022045da448bc99003af6cf6d4c74ec9891c60932013dde7451abca4a6bc40b6138d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '10409988',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04657461624ca104acd46779fb7a9a8e24656ba7ffcbc066bb78701630b0a3fd1c36a3e2b605d78e1d995ea990096a3f76077985d2194fd1a87369921545a544992c86414ed859247ab8f9c2979ed9b8fecb2cfaa7ff74f1daf6f7c00f3d97a5b942aecba54bf155d464606b6faa6f5efcbdf3f525b3283acf6867d11cfc30623c3107a87b499f68ca00602492c9cdca9b481c7f2b65a6ecd481bfdd244954b32a45c658592182ad',
            },
            {
                value: '1200',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                value: '10408333',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758550,
            hash: '000000000000000009f8cdae9bb21a321896126e06413a4e8af24a182edf701e',
            timestamp: '1663947819',
        },
        timeFirstSeen: '1663946739',
        size: 404,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockFlatTxHistoryWithUnconfirmed = [
    {
        txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                    outIdx: 2,
                },
                inputScript:
                    '473044022024a187f6dc32082e765eeb37e1a6726e99871b3df0c385ad135ddcf73df0e79102203b81d7eb112a193e23147974432bb12116d75e995aa8c3b6a51943cc4dbd8694412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12214100',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010747454e4553495303434b410d4368726f6e696b20416c7068611468747470733a2f2f636173687461622e636f6d2f4c0001084c000800000014b230ce38',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '88888888888',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: 'a83257b2facf7c6d4f8df9a307dee9cc79af9323b8bb803994d5c967bf916569',
                    outIdx: 1,
                },
            },
            {
                value: '12213031',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '5fc6f53ef0f94e66d5f6983402441cfdece1dbd35bd500b6e15881d1b37aa93f',
                    outIdx: 67,
                },
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'GENESIS',
                tokenId:
                    '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
            },
            genesisInfo: {
                tokenTicker: 'CKA',
                tokenName: 'Chronik Alpha',
                tokenDocumentUrl: 'https://cashtab.com/',
                tokenDocumentHash: '',
                decimals: 8,
            },
        },
        block: {
            height: 757174,
            hash: '000000000000000011c5e064ac6295bb1c1e1c306019e591b9c79290c24c33ff',
            timestamp: '1663091856',
        },
        timeFirstSeen: '1663091668',
        size: 304,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                    outIdx: 3,
                },
                inputScript:
                    '47304402201623de13a2cd38d379a08dbee1cb2239571b6166bf9923ffe44ae108fd21931c022030dcd5b08a997dcaa7af505a5e513985317b2da91d2f4d4879ee941e3b8931ad412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12218055',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04657461624c910458f886baf61daf6fa1909aab79e30bca8d35d634c6c5e969b2157b87e67fa010252a9fd1eebeed00075d0fb7bcc0dcb73b41cc73adacdae2be18d31643ad3f33d95f9a97e7cf00b2231fd0a7d37f36d082c86a392bde59eac693c002f861082d7d3cbc23eafd4511afe3619bfc0f0c028454038dee71a6e7796395574b9a06b9bf7aaf0cd607e59f4ad641393d746f88',
            },
            {
                value: '3500',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '12214100',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: '1663090626',
        },
        timeFirstSeen: '1663089642',
        size: 387,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                    outIdx: 2,
                },
                inputScript:
                    '47304402202267233e578abb21efa28bc606501f582f94915d3b07ceedff39750877c7211d02206cfec78f41fe58723938c199fa908f4e13ebb298cc989be30faa1e6838c22af1412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12224078',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04007461621c54657374696e67206d756c74692d73656e642077697468206e6f7465',
            },
            {
                value: '2200',
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
            {
                value: '3300',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '12218055',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: '1663090626',
        },
        timeFirstSeen: '1663089621',
        size: 303,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f3e4140c8f1614612c07ffe4d35e697d5ffd0931d7b18b9360f5f431c6704d11022002b5fd03e7f9b849fec1c0374dc3df2f1f2dae333980bd02aaa3710b66d1eb0e412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12230101',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '3300',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '2200',
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
            {
                value: '12224078',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: '1663090626',
        },
        timeFirstSeen: '1663089593',
        size: 260,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221008f8052c8b78a4d250f4596b3a14c85fb2d253ce20d972422829dc4a68a87320702202b7d272a96996bab1914f693939dfc6300184f5f3db0acc5acfc155ba19d7642412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12233856',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '3300',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '12230101',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: '1663090626',
        },
        timeFirstSeen: '1663089364',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                    outIdx: 1,
                },
                inputScript:
                    '473044022038c75f93d7abe8e6e63c0981203acd48c7e6df92ba52cc9399df84b0b367ee200220356508913a5f8ad94d126891fea372bb2bf66a249bdb63332a4625cb359865f8412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12235011',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a04007461620454657374',
            },
            {
                value: '700',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '12233856',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 755309,
            hash: '0000000000000000115c75e7b0728b548e9f21bb9ebdcad68d36475e712ceed5',
            timestamp: '1661972428',
        },
        timeFirstSeen: '1661972247',
        size: 245,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f288e71276e2389744ecb3c98bdf0c119d19966ac086c5f5908f8c3a878aa7e402203c07905536720391f472457f52f5cf6aaeb4fa02fdf59722f25768a36fd6157f412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12243166',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '7700',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                spentBy: {
                    txid: '04eedd3f4b4dc9727e393ad3e774f2dc0c6acf9e920dc6fcbcbf95ed9b98477c',
                    outIdx: 3,
                },
            },
            {
                value: '12235011',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 743257,
            hash: '000000000000000013259e217a18907ba956c55f839b6b15a11a79a2bf303d9f',
            timestamp: '1654812393',
        },
        timeFirstSeen: '0',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100d541ef12cc57c3b3cc95b338aec21775b27441d12eda662dcff23a46d07cc9450220467d2aae0dadcae787db33dab6adc86ec47aafea0133cc2130a62bb8247491d6412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '14743621',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2500000',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '55388f67ab1b23d2e6c146472b836c1ba1df33dd9b7685bed34c6c9ce6fe5c0e',
                    outIdx: 0,
                },
            },
            {
                value: '12243166',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 742800,
            hash: '000000000000000009e1ed934f027563d161d1f59a00253496b0c847c2288c38',
            timestamp: '1654543720',
        },
        timeFirstSeen: '0',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '41e306829bca85422ac5cbf2baad3d1a4e79c3bbb8f042cf0aa7ae2df49535a5',
                    outIdx: 1,
                },
                inputScript:
                    '473044022046faa2cc8efc0a06b2cfa8b80b658d4dc09bc1524cba1cb4ab456f8bc9ebf37902205074d7975824a06d6cba90dc91503f29801d9c180253bbe4ecefb42ddc82da6d412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '14746276',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04657461624c810406fe30e60d38c4408043ca5b43cd515db4b10af477007962db6d019eeb9c3f6734c495574368da107bb00b32a27d096069706a0fb91fe18d0d8281c1b826fdd862a1955dd0d28b4e0245c862085f172d3947ca202953095ed014258f069c4d3fc36706e842b6643061e4ce70b91fb5b5b206de4d3b81a621ad9d4456c3f0cf6b',
            },
            {
                value: '2200',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '31e5bf25b892e173483c7b100a5b0fcda03cac9337c335fda3b3a5cf17b64759',
                    outIdx: 0,
                },
            },
            {
                value: '14743621',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 741058,
            hash: '00000000000000000bb6dc63cd48a9b0dcf37a9b722618209dc85a79e8dc7973',
            timestamp: '1653506978',
        },
        timeFirstSeen: '0',
        size: 371,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '41e306829bca85422ac5cbf2baad3d1a4e79c3bbb8f042cf0aa7ae2df49535a5',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '63a11be653e333ae3e1075791c996d46b5f476b483c4ccf4ec33b524028d7cd5',
                    outIdx: 1,
                },
                inputScript:
                    '47304402204c6140c524e40653e85440aff615af47a481accc9dc8b45548d59a3ae91d3a0802200aa1667d00b16d3a80c5d4d1b4cabeee415289ef6818496f92abf9ec2db8262c412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '14748931',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2200',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '46158de814d73ded1a8f91221c85d9c91c696eaf14f0bd10e6fa7215bacf7852',
                    outIdx: 1,
                },
            },
            {
                value: '14746276',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 739747,
            hash: '0000000000000000079aa77192cf335b2004788c2860be98c310a5187a588dd3',
            timestamp: '1652722196',
        },
        timeFirstSeen: '0',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'fa2e8951ee2ba44bab33e38c5b903bf77657363cffe268e8ae9f4728e14b04d8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '6f0f29e02308fa670e8412f4c2d84e7e46f8d3fd6436dbc8676b8af99bb34a60',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100920a6f8696b0fadd7b82f3450090cd7f198d7287551bb8f08065951c7e5f9455022004d5d8304b056f2f4a6474392665cf8dfd897ea02f18506aced86b552482e404412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '3d60d2d130eee3e45e6a2d0e88e2ecae82d70c1ed1afc8f62ca9c8564d38108d',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221008461ccf6961f300a0f8c7ec5526813b531aea5033cacef6d15ab7e033f50130102206d22a9a7bd0ec2f04ace2c0642f233fea3bbed7ee677e53416845a0bfd367044412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '17',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000e080000000000000003',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '14',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '3',
                    isMintBaton: false,
                },
            },
            {
                value: '1482',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
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
        timeFirstSeen: '1663957661',
        size: 481,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'cd4b0008e90b2a872dc92e19cdd87f52466b801f037641193196e75ff10f6990',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '0cf5a88f891b76da82c2d48d548f7e445355d6d8695ce91f1aee13e641a34183',
                    outIdx: 1,
                },
                inputScript:
                    '473044022064c39d8fa6b89fcd0961d06ee7c6976c798b2de6f33bdd58b6db56a2c45b235102204444a625e5328eee7139110c03100bdc062292f28d6de8e2b36536a39d2466df412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '4f1a2f3e24b270b57e4d6b9bc6204360cdfeb1dfeca7d92379d49a7ba55c8a5f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100cff4ca28b0bd320f4aa7bd3029b0c1e48c392b42c56b7dfdca292bbb14302e5f02206bc74177a98481e49c937a6229ebd8191f653a363c95cd37b69f1300f05f6d3a412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '46cf8bf009dbc6da45045c23af878cd2fd6dd3d3f62bf524d675e75959d5fdbd',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100ad48dd7d1196b108e3ee0412edcbe468031dcf48244b9b4b57f6cc9e710c836602202e5a00a2c9e1e6fc8937af70fcb8018e299dd007235229e6e3d87f6af9f8761c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '228',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000d0800000000000000d7',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '13',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '215',
                    isMintBaton: false,
                },
            },
            {
                value: '1255',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
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
        timeFirstSeen: '1663957652',
        size: 628,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '7fcdf5c36d246ede7fb64fed835a2400b0700ecedfdf4e6f738e5a8026d44275',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '09be4bad8545cb249fe8673be5e45d5d1109a8a91b6a862a6e9ad041e2f3232d',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100c30541783609812c5a4066e6395488f3bcabc0cd5a21444d79868c31016b5c9f02200d1c7709f414411a3e3cd9dbf606648339fb2c309b016e490d52aa565510e151412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1700',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1200',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663957640',
        size: 192,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '4993ad3b9db58bef37689a304c485bdc16c6418e05d2b57c77f8b8a2fb3450e4',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '053d08a11f6da2720a093b55f907a9bdb4246e8ddc032a40347d4823e6c1a046',
                    outIdx: 0,
                },
                inputScript:
                    '47304402202608525692251d17e680b7856da6abda3e92b51fbfc4fc852586355bde4fe6d30220737203dc6832383b5cc1edc45bbc972a7c18e6b3de69fd8f0cc93b0a0fbd3fa5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '5500',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1100',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '3945',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663957633',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'e8bb28fd679fc66ade43a79d088f6b63a2b87d85dbdd5fcd07d7fd7e9be8b1e8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '76684ecd7296b5c97dc8a8ff41a12188ad8b50ba19f2a9c69e67bdb03be6188e',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100ed4f81298d98a4d9c16749cd50ed050dcbbba30266e7c1605f08142ca3f8b9390220298f5290847be114fa33eb931985ea9dd61c39043112db3fcdfcf1efad508247412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1000',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '745',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663957623',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '09033290a18b5c3054dbb6df8b6ad5c3e2bc121ab4cb2a91f79cedb36f05a2ef',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c0ab154992174fc86381540dbf016d64c4e218a07aec7d5734a841ccbab93e1c',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f50735a67538602ec240725f9160bdfc96b4ae443fff2cebaf25485e8f98f5720220584ab745222cc7a0cd33d6f287885781b8009bc1e819b9b97436ecdb31abeff2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '49545',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1300',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '47790',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663956020',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'daf142f1f90dc81efeafb94f986b951ff3bae6fb155565d96fd091e34e61ee29',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5b679c422abc750576c188e3ed0729fb0e452f6ae0a8ad118026755fbceb00b1',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ac91ae0c612165e500605ae41080a30be891ef757c378733bfe5533f331d0e97022020babc7d6a267fc5fbab8ba9740968732978abf4cf63e049721c008532204bf8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '47562',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1200',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '45907',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663956011',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '376593dc3d3e305843fe23692e1477ae13ae1e8bfc778273c544a0c5d6285337',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '930259a2fe4de56a15ab33d5f2b13bfd08568c3d662df6b1a3c090a19aab8104',
                    outIdx: 0,
                },
                inputScript:
                    '48304502210086a6072eaabb3502c73cbb6701c04edca374de60d62b888614d76b352203e9d602205721cec95da5a0ceda4cf54bf4bf8f54bec3d07b1caa75e1d65a87d8b5572f0f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1100',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '1745',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663956003',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '2faa94a50ddffc795f6044214efbca0d0190ed520e7e0fd35c4623ecd64b4e45',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '08ac32dc47252668cd32dbe0d9af15d1ae9e282ae56c3743a258d11613105924',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207031eafbfb4f762f1eb719defa8cb890f55085c593244eecce57082b7013fd4f02205178c40c57903baa3d9ebf554d2f3892859599b6e358e10725db81c14de4c80f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                    outIdx: 2,
                },
                inputScript:
                    '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '34',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '5',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '29',
                    isMintBaton: false,
                },
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
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663955995',
        size: 445,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'c66b09f5c6b2afa5c63ff7c2ca2cc8d9538568a18c75b0e7d900c9c1be2758f7',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '43beeeeb761c401a1d121840e87c86237c98e9310e889feb0a34426e2a1ee463',
                    outIdx: 0,
                },
                inputScript:
                    '4730440220606efba360bf0843f8c3fe9fab7d1cdc34852395b9045a4c3cf8f27b91d414f2022054fb11ce6e4fd2ee50ba467e94460c63e45fb563e330fc35c5caa8eea71e93b7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1900',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '945',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: '1663955917',
        },
        timeFirstSeen: '1663955710',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockSortedFlatTxHistoryWithUnconfirmed = [
    {
        txid: 'fa2e8951ee2ba44bab33e38c5b903bf77657363cffe268e8ae9f4728e14b04d8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '6f0f29e02308fa670e8412f4c2d84e7e46f8d3fd6436dbc8676b8af99bb34a60',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100920a6f8696b0fadd7b82f3450090cd7f198d7287551bb8f08065951c7e5f9455022004d5d8304b056f2f4a6474392665cf8dfd897ea02f18506aced86b552482e404412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '3d60d2d130eee3e45e6a2d0e88e2ecae82d70c1ed1afc8f62ca9c8564d38108d',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221008461ccf6961f300a0f8c7ec5526813b531aea5033cacef6d15ab7e033f50130102206d22a9a7bd0ec2f04ace2c0642f233fea3bbed7ee677e53416845a0bfd367044412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '17',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000e080000000000000003',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '14',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '3',
                    isMintBaton: false,
                },
            },
            {
                value: '1482',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
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
        timeFirstSeen: '1663957661',
        size: 481,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'cd4b0008e90b2a872dc92e19cdd87f52466b801f037641193196e75ff10f6990',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '0cf5a88f891b76da82c2d48d548f7e445355d6d8695ce91f1aee13e641a34183',
                    outIdx: 1,
                },
                inputScript:
                    '473044022064c39d8fa6b89fcd0961d06ee7c6976c798b2de6f33bdd58b6db56a2c45b235102204444a625e5328eee7139110c03100bdc062292f28d6de8e2b36536a39d2466df412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '4f1a2f3e24b270b57e4d6b9bc6204360cdfeb1dfeca7d92379d49a7ba55c8a5f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100cff4ca28b0bd320f4aa7bd3029b0c1e48c392b42c56b7dfdca292bbb14302e5f02206bc74177a98481e49c937a6229ebd8191f653a363c95cd37b69f1300f05f6d3a412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '46cf8bf009dbc6da45045c23af878cd2fd6dd3d3f62bf524d675e75959d5fdbd',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100ad48dd7d1196b108e3ee0412edcbe468031dcf48244b9b4b57f6cc9e710c836602202e5a00a2c9e1e6fc8937af70fcb8018e299dd007235229e6e3d87f6af9f8761c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '228',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000d0800000000000000d7',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '13',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '215',
                    isMintBaton: false,
                },
            },
            {
                value: '1255',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
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
        timeFirstSeen: '1663957652',
        size: 628,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '7fcdf5c36d246ede7fb64fed835a2400b0700ecedfdf4e6f738e5a8026d44275',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '09be4bad8545cb249fe8673be5e45d5d1109a8a91b6a862a6e9ad041e2f3232d',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100c30541783609812c5a4066e6395488f3bcabc0cd5a21444d79868c31016b5c9f02200d1c7709f414411a3e3cd9dbf606648339fb2c309b016e490d52aa565510e151412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1700',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1200',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663957640',
        size: 192,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '4993ad3b9db58bef37689a304c485bdc16c6418e05d2b57c77f8b8a2fb3450e4',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '053d08a11f6da2720a093b55f907a9bdb4246e8ddc032a40347d4823e6c1a046',
                    outIdx: 0,
                },
                inputScript:
                    '47304402202608525692251d17e680b7856da6abda3e92b51fbfc4fc852586355bde4fe6d30220737203dc6832383b5cc1edc45bbc972a7c18e6b3de69fd8f0cc93b0a0fbd3fa5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '5500',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1100',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '3945',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663957633',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'e8bb28fd679fc66ade43a79d088f6b63a2b87d85dbdd5fcd07d7fd7e9be8b1e8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '76684ecd7296b5c97dc8a8ff41a12188ad8b50ba19f2a9c69e67bdb03be6188e',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100ed4f81298d98a4d9c16749cd50ed050dcbbba30266e7c1605f08142ca3f8b9390220298f5290847be114fa33eb931985ea9dd61c39043112db3fcdfcf1efad508247412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1000',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '745',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663957623',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '09033290a18b5c3054dbb6df8b6ad5c3e2bc121ab4cb2a91f79cedb36f05a2ef',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c0ab154992174fc86381540dbf016d64c4e218a07aec7d5734a841ccbab93e1c',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f50735a67538602ec240725f9160bdfc96b4ae443fff2cebaf25485e8f98f5720220584ab745222cc7a0cd33d6f287885781b8009bc1e819b9b97436ecdb31abeff2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '49545',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1300',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '47790',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663956020',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'daf142f1f90dc81efeafb94f986b951ff3bae6fb155565d96fd091e34e61ee29',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5b679c422abc750576c188e3ed0729fb0e452f6ae0a8ad118026755fbceb00b1',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ac91ae0c612165e500605ae41080a30be891ef757c378733bfe5533f331d0e97022020babc7d6a267fc5fbab8ba9740968732978abf4cf63e049721c008532204bf8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '47562',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1200',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '45907',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663956011',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '376593dc3d3e305843fe23692e1477ae13ae1e8bfc778273c544a0c5d6285337',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '930259a2fe4de56a15ab33d5f2b13bfd08568c3d662df6b1a3c090a19aab8104',
                    outIdx: 0,
                },
                inputScript:
                    '48304502210086a6072eaabb3502c73cbb6701c04edca374de60d62b888614d76b352203e9d602205721cec95da5a0ceda4cf54bf4bf8f54bec3d07b1caa75e1d65a87d8b5572f0f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1100',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '1745',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663956003',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '2faa94a50ddffc795f6044214efbca0d0190ed520e7e0fd35c4623ecd64b4e45',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '08ac32dc47252668cd32dbe0d9af15d1ae9e282ae56c3743a258d11613105924',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207031eafbfb4f762f1eb719defa8cb890f55085c593244eecce57082b7013fd4f02205178c40c57903baa3d9ebf554d2f3892859599b6e358e10725db81c14de4c80f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                    outIdx: 2,
                },
                inputScript:
                    '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '34',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '5',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '29',
                    isMintBaton: false,
                },
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
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: '1663956316',
        },
        timeFirstSeen: '1663955995',
        size: 445,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'c66b09f5c6b2afa5c63ff7c2ca2cc8d9538568a18c75b0e7d900c9c1be2758f7',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '43beeeeb761c401a1d121840e87c86237c98e9310e889feb0a34426e2a1ee463',
                    outIdx: 0,
                },
                inputScript:
                    '4730440220606efba360bf0843f8c3fe9fab7d1cdc34852395b9045a4c3cf8f27b91d414f2022054fb11ce6e4fd2ee50ba467e94460c63e45fb563e330fc35c5caa8eea71e93b7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1900',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '945',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: '1663955917',
        },
        timeFirstSeen: '1663955710',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockFlatTxHistoryWithAllUnconfirmed = [
    {
        txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
                    outIdx: 1,
                },
                inputScript:
                    '4730440220724f1f261ad1e2b6b21e065632c6da0ebe3701693205f5485b395d747645fdf502207062fda8367c20b3e090391994176bf5b40877c1b60e450d73a37255d6ee10dd412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '39162',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2500',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '36207',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960417',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                    outIdx: 1,
                },
                inputScript:
                    '48304502210084dcee7aefac851d47e1a8dbadc4a6263fe87a661ed37541d611c8765510501f022001e606d50a8c784b0295dd7e4e5fe58f89592cf9d81f4de6daf7bdf6ee2a32a8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '42017',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2400',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '39162',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960406',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
                    outIdx: 3,
                },
                inputScript:
                    '473044022036cd1605ab5122e9769549cf953d5638022c99dcb6c838c77eeaa958e14ba5180220466cced2c01885f83e38e26821238dd0b9697c5029e232cfe6cb5356742ebe58412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '44772',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                },
            },
        ],
        outputs: [
            {
                value: '2300',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '42017',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960398',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 3,
                },
                inputScript:
                    '47304402206be85d81c79a53dc6a598e08091ad6aededdc4a710601c9fb477cff9dab24c7402200ec9bf7b1f0ce605916b8308ebea3d8024280659229db43d53be05ed5a0be5f0412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1825562',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                },
            },
        ],
        outputs: [
            {
                value: '2200',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '1822907',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960388',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'f051b152f13004c18b5aab3b615d88af8175fa5416426fb73e3731fa530f064d',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100b6a6027d41170d2bb917b632a4a30df60ef3b51e90a27eb701f18a63a99a4313022029ccbace732ee942f8ee5773bbc4a3e3dd046af7e9ccf5889d8c333d27e302d8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1190050',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                },
            },
        ],
        outputs: [
            {
                value: '2100',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '1187495',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960377',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 3,
                },
                inputScript:
                    '48304502210092f2508a5f19b67be121dc5d8fd70569d9275a11f2c1724db8c714ad4d06b14e02206e8a3101f8ceecc19b5508455e1542c65847951456cf884444e951d6e0cfb5ef412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '46590',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200e225ab4c7d20aef968d95fbf6f881f313c9b35aef891edd4192c5320f147f2502205794732b6242c3a445ee1340ca03950e2044321b9c99bf7d5805ea36cac756dc412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8832',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f4808000000000000000508000000000000227b',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '5',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8827',
                    isMintBaton: false,
                },
            },
            {
                value: '44772',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960365',
        size: 480,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c9cd91d763aeb252b889f815f7ca79e0360f0b208ce7cd95f0353d3615173805',
                    outIdx: 1,
                },
                inputScript:
                    '47304402206a807dad013e5bbb5a78bc12349c550f1867be0ec46ebe4a18ca0ffb45b84cf802206345b92bdec24663bc4fb168d6e1601781969393e93fbcad5279fa72bde08774412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1827380',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200fdb134c8a13fbd1b95ef118c247a8a911e9d52ecaafc86ebb80cc179d69c1e002200bd4dc809c998a511e09f939a3270f7a2f9babae9d75919d2fef83ed66cf7dde412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8836',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000004080000000000002280',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '4',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8832',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
                    outIdx: 1,
                },
            },
            {
                value: '1825562',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960353',
        size: 479,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100860067702a7ec139379913db22f4aaaca611e1d5cfd89df1c335bc9b72ee36d0022063892a87d269db12a7be0b24e721900b1f287ce9d1fb18431b2cc508ecebfdf7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '45507',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c96c70b94f5386efff2a8873d35d7b4c29fafe11555cf2a3daea8f905fb0f73502203751a29b351cca9c337345388237b98312873f44976f08667ae6540423a8d012412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8839',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000003080000000000002284',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '3',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8836',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 1,
                },
            },
            {
                value: '43689',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960344',
        size: 481,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                    outIdx: 1,
                },
                inputScript:
                    '4730440220219fdd01482905c336ef8345973339ebe6f540fb7ff7f04d808357fd73c137b302207cb8af146cdf3ec643d85f71c9b95bc6b4fa4e0c19d5f76baf0329f4e315ab4d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '848',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f8df9b24dc337b5c7b0b41f454fb535a181aa95814d01e3e2246908fda3a5d800220417d4bd3c10d59f9655ddae4229813222abd9a5b148db1a456fde4719ea8dc56412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '4800',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100dcc45ddcb243a56ddee5d050dd961d553f4f93704378ce517ad47a161c6f768b022000ef68375269494caa36c9f063ecd6181dfb77b8c4e0e09fdb0433d5a484974e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8841',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000002080000000000002287',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '2',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8839',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 1,
                },
            },
            {
                value: '3503',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960334',
        size: 628,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '487c4a2fe93806f75670fff2dc0f5906739a8bf02dcf32af1759f33c17f8dc91',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100c1717019de60065cae38519a85a80723fc3ee73573739381ee02fcaaa34a15fd022063059a69397ad3108c2f955c92d195a90e8f1f616e23df132abb6675ac5800c2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '992',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '5bb9474c4d682171091ecba6203d3365dab6f3901936122d8035098a80596e2e',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221009b897d907bda2da570c5c273ab277b73c60d8fd39ba605829d0ec4b796fb7c20022011cc67871bf5df4693904fcdee80ac1adba332b14a4cdc9113b15f28e288adad412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1191203',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '487c4a2fe93806f75670fff2dc0f5906739a8bf02dcf32af1759f33c17f8dc91',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100be82f7c67c73ecf068905a44ca2147d89b8041e54a432386b25137f7bea0d0aa0220416607e30a8d8d8c08237032eeb7728f938650a70215f6615939cd2455569539412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8842',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000001080000000000002289',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '1',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8841',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
            },
            {
                value: '1190050',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'f051b152f13004c18b5aab3b615d88af8175fa5416426fb73e3731fa530f064d',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960323',
        size: 629,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockSortedFlatTxHistoryWithAllUnconfirmed = [
    {
        txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
                    outIdx: 1,
                },
                inputScript:
                    '4730440220724f1f261ad1e2b6b21e065632c6da0ebe3701693205f5485b395d747645fdf502207062fda8367c20b3e090391994176bf5b40877c1b60e450d73a37255d6ee10dd412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '39162',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2500',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '36207',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960417',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                    outIdx: 1,
                },
                inputScript:
                    '48304502210084dcee7aefac851d47e1a8dbadc4a6263fe87a661ed37541d611c8765510501f022001e606d50a8c784b0295dd7e4e5fe58f89592cf9d81f4de6daf7bdf6ee2a32a8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '42017',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2400',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '39162',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960406',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
                    outIdx: 3,
                },
                inputScript:
                    '473044022036cd1605ab5122e9769549cf953d5638022c99dcb6c838c77eeaa958e14ba5180220466cced2c01885f83e38e26821238dd0b9697c5029e232cfe6cb5356742ebe58412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '44772',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                },
            },
        ],
        outputs: [
            {
                value: '2300',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '42017',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960398',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 3,
                },
                inputScript:
                    '47304402206be85d81c79a53dc6a598e08091ad6aededdc4a710601c9fb477cff9dab24c7402200ec9bf7b1f0ce605916b8308ebea3d8024280659229db43d53be05ed5a0be5f0412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1825562',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                },
            },
        ],
        outputs: [
            {
                value: '2200',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '1822907',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960388',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'f051b152f13004c18b5aab3b615d88af8175fa5416426fb73e3731fa530f064d',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100b6a6027d41170d2bb917b632a4a30df60ef3b51e90a27eb701f18a63a99a4313022029ccbace732ee942f8ee5773bbc4a3e3dd046af7e9ccf5889d8c333d27e302d8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1190050',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                },
            },
        ],
        outputs: [
            {
                value: '2100',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '1187495',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960377',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 3,
                },
                inputScript:
                    '48304502210092f2508a5f19b67be121dc5d8fd70569d9275a11f2c1724db8c714ad4d06b14e02206e8a3101f8ceecc19b5508455e1542c65847951456cf884444e951d6e0cfb5ef412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '46590',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200e225ab4c7d20aef968d95fbf6f881f313c9b35aef891edd4192c5320f147f2502205794732b6242c3a445ee1340ca03950e2044321b9c99bf7d5805ea36cac756dc412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8832',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f4808000000000000000508000000000000227b',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '5',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8827',
                    isMintBaton: false,
                },
            },
            {
                value: '44772',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960365',
        size: 480,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c9cd91d763aeb252b889f815f7ca79e0360f0b208ce7cd95f0353d3615173805',
                    outIdx: 1,
                },
                inputScript:
                    '47304402206a807dad013e5bbb5a78bc12349c550f1867be0ec46ebe4a18ca0ffb45b84cf802206345b92bdec24663bc4fb168d6e1601781969393e93fbcad5279fa72bde08774412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1827380',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200fdb134c8a13fbd1b95ef118c247a8a911e9d52ecaafc86ebb80cc179d69c1e002200bd4dc809c998a511e09f939a3270f7a2f9babae9d75919d2fef83ed66cf7dde412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8836',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000004080000000000002280',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '4',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8832',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
                    outIdx: 1,
                },
            },
            {
                value: '1825562',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960353',
        size: 479,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100860067702a7ec139379913db22f4aaaca611e1d5cfd89df1c335bc9b72ee36d0022063892a87d269db12a7be0b24e721900b1f287ce9d1fb18431b2cc508ecebfdf7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '45507',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c96c70b94f5386efff2a8873d35d7b4c29fafe11555cf2a3daea8f905fb0f73502203751a29b351cca9c337345388237b98312873f44976f08667ae6540423a8d012412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8839',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000003080000000000002284',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '3',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8836',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 1,
                },
            },
            {
                value: '43689',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960344',
        size: 481,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                    outIdx: 1,
                },
                inputScript:
                    '4730440220219fdd01482905c336ef8345973339ebe6f540fb7ff7f04d808357fd73c137b302207cb8af146cdf3ec643d85f71c9b95bc6b4fa4e0c19d5f76baf0329f4e315ab4d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '848',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f8df9b24dc337b5c7b0b41f454fb535a181aa95814d01e3e2246908fda3a5d800220417d4bd3c10d59f9655ddae4229813222abd9a5b148db1a456fde4719ea8dc56412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '4800',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100dcc45ddcb243a56ddee5d050dd961d553f4f93704378ce517ad47a161c6f768b022000ef68375269494caa36c9f063ecd6181dfb77b8c4e0e09fdb0433d5a484974e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8841',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000002080000000000002287',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '2',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8839',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 1,
                },
            },
            {
                value: '3503',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960334',
        size: 628,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '487c4a2fe93806f75670fff2dc0f5906739a8bf02dcf32af1759f33c17f8dc91',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100c1717019de60065cae38519a85a80723fc3ee73573739381ee02fcaaa34a15fd022063059a69397ad3108c2f955c92d195a90e8f1f616e23df132abb6675ac5800c2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '992',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '5bb9474c4d682171091ecba6203d3365dab6f3901936122d8035098a80596e2e',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221009b897d907bda2da570c5c273ab277b73c60d8fd39ba605829d0ec4b796fb7c20022011cc67871bf5df4693904fcdee80ac1adba332b14a4cdc9113b15f28e288adad412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1191203',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '487c4a2fe93806f75670fff2dc0f5906739a8bf02dcf32af1759f33c17f8dc91',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100be82f7c67c73ecf068905a44ca2147d89b8041e54a432386b25137f7bea0d0aa0220416607e30a8d8d8c08237032eeb7728f938650a70215f6615939cd2455569539412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8842',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000001080000000000002289',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '1',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8841',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
            },
            {
                value: '1190050',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'f051b152f13004c18b5aab3b615d88af8175fa5416426fb73e3731fa530f064d',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960323',
        size: 629,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockParseAliasTxWallet = {
    mnemonic: 'string',
    name: 'string',
    Path245: {
        publicKey: 'string',
        hash160: '6f4f6d5b569b7696bc18593b8593f05bf3edd3d9',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    Path145: {
        publicKey: 'string',
        hash160: 'fcf21a34c255c067e24dfc183f294b50694600a6',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    Path1899: {
        publicKey: 'string',
        hash160: 'dc1147663948f0dcfb00cc407eda41b121713ad3',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    state: {
        balances: {
            totalBalanceInSatoshis: '55421422',
            totalBalance: '554214.22',
        },
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [],
        parsedTxHistory: [],
    },
};

export const anotherMockParseTxWallet = {
    mnemonic: 'string',
    name: 'string',
    Path245: {
        publicKey:
            '02c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
        hash160: 'a9f494266e4b3c823712f27dedcb83e30b2fe59f',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    Path145: {
        publicKey:
            '03c477d7c44c1aff1549cdb74a32daea2ab4db9c664662a14aedfcb719cec96f29',
        hash160: '1fb76a7db96fc774cbad00e8a72890602b4be304',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    Path1899: {
        publicKey:
            '03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
        hash160: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    state: {
        balances: {
            totalBalanceInSatoshis: '55421422',
            totalBalance: '554214.22',
        },
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [],
        parsedTxHistory: [],
    },
};

export const mockParseTxWallet = {
    mnemonic: 'string',
    name: 'string',
    Path245: {
        publicKey: 'string',
        hash160: '58549b5b93428fac88e36617456cd99a411bd0eb',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    Path145: {
        publicKey: 'string',
        hash160: '438a162355ef683062a7fde9d08dd720397aaee8',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    Path1899: {
        publicKey: 'string',
        hash160: '76458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    state: {
        balances: {
            totalBalanceInSatoshis: '55421422',
            totalBalance: '554214.22',
        },
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [],
        parsedTxHistory: [],
    },
};
export const mockAliasWallet = {
    mnemonic: 'string',
    name: 'string',
    Path245: {
        publicKey: 'string',
        hash160: '6f4f6d5b569b7696bc18593b8593f05bf3edd3d9',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    Path145: {
        publicKey: 'string',
        hash160: 'fcf21a34c255c067e24dfc183f294b50694600a6',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    Path1899: {
        publicKey: 'string',
        hash160: 'dc1147663948f0dcfb00cc407eda41b121713ad3',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    state: {
        balances: {
            totalBalanceInSatoshis: '55421422',
            totalBalance: '554214.22',
        },
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [],
        parsedTxHistory: [],
    },
};
export const mockParseTxWalletAirdrop = {
    mnemonic: 'string',
    name: 'string',
    Path245: {
        publicKey:
            '02c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
        hash160: 'a9f494266e4b3c823712f27dedcb83e30b2fe59f',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    Path145: {
        publicKey:
            '03c477d7c44c1aff1549cdb74a32daea2ab4db9c664662a14aedfcb719cec96f29',
        hash160: '1fb76a7db96fc774cbad00e8a72890602b4be304',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    Path1899: {
        publicKey:
            '03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
        hash160: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    state: {
        balances: {
            totalBalanceInSatoshis: '55421422',
            totalBalance: '554214.22',
        },
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [],
        parsedTxHistory: [],
    },
};
export const mockParseTxWalletEncryptedMsg = {
    mnemonic:
        'because achieve voyage useful ticket stem armed air pretty stand leaf bicycle',
    name: 'Test Encrypt Burnt Wif',
    Path245: {
        publicKey:
            '0375182c1737822265efaed62e91f84d34739cdc783ff8072165242fac4c8e32ab',
        hash160: '278ac23f8ef6c40b98c23972cc60effdfe477326',
        cashAddress: 'bitcoincash:qqnc4s3l3mmvgzuccguh9nrqal7lu3mnycmmlefsfr',
        slpAddress: 'simpleledger:qqnc4s3l3mmvgzuccguh9nrqal7lu3mnychq5zusha',
        fundingWif: 'L3HmNCzg2fVd8q8JP8fU4mkKhFXo74Gskfp9UatMh7WJ9FTwQQix',
        fundingAddress:
            'simpleledger:qqnc4s3l3mmvgzuccguh9nrqal7lu3mnychq5zusha',
        legacyAddress: '14c5acR4uXmwH1dvWWmqnabD4H2mWhAuYW',
    },
    Path145: {
        publicKey:
            '03cfb60b9f457ce676ec01b4e92f05a08214989116650830e45b60e2c8cc144a77',
        hash160: 'dbff532189502b22ecf88e10bc78d42c3785240b',
        cashAddress: 'bitcoincash:qrdl75ep39gzkghvlz8pp0rc6skr0pfypv7htttdhx',
        slpAddress: 'simpleledger:qrdl75ep39gzkghvlz8pp0rc6skr0pfypvjvqs7dfc',
        fundingWif: 'L4TaWveyX8xEY7jLnS86JotV3tQkb1GqCaGxymES1i6Mkj5M77Cm',
        fundingAddress:
            'simpleledger:qrdl75ep39gzkghvlz8pp0rc6skr0pfypvjvqs7dfc',
        legacyAddress: '1M4ErHUrjrv5zBv3YfGSkAkHdKYUnx4V2D',
    },
    Path1899: {
        publicKey:
            '038c4c26730d97cdeb18e69dff6c47cebb23e6f305c950923cd6110f35ab9006d0',
        hash160: 'ee6dc9d40f95d8e106a63385c6fa882991b9e84e',
        cashAddress: 'bitcoincash:qrhxmjw5p72a3cgx5cect3h63q5erw0gfc4l80hyqu',
        slpAddress: 'simpleledger:qrhxmjw5p72a3cgx5cect3h63q5erw0gfceyv5zy7z',
        fundingWif: 'Kwt39o7LZJ54nKyYU2Sz6dAZToXtFvYHtn6xKf2Nbi5E9kZfpHSH',
        fundingAddress:
            'simpleledger:qrhxmjw5p72a3cgx5cect3h63q5erw0gfceyv5zy7z',
        legacyAddress: '1NjhLtSNF32Nay82jV1b7yv6s7mxaeFeYP',
    },
    state: {
        balances: {
            totalBalanceInSatoshis: '49545',
            totalBalance: '495.45',
        },
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '45411aa786288b679d1c1874f7b126d5ea0c83380304950d364b5b8279a460de',
                    outIdx: 1,
                },
                blockHeight: -1,
                isCoinbase: false,
                value: '48445',
                network: 'XEC',
                address:
                    'bitcoincash:qrhxmjw5p72a3cgx5cect3h63q5erw0gfc4l80hyqu',
            },
            {
                outpoint: {
                    txid: '66974f4a22ca1a4aa36c932b4effafcb9dd8a32b8766dfc7644ba5922252c4c6',
                    outIdx: 1,
                },
                blockHeight: -1,
                isCoinbase: false,
                value: '1100',
                network: 'XEC',
                address:
                    'bitcoincash:qrhxmjw5p72a3cgx5cect3h63q5erw0gfc4l80hyqu',
            },
        ],
        parsedTxHistory: [
            {
                txid: '66974f4a22ca1a4aa36c932b4effafcb9dd8a32b8766dfc7644ba5922252c4c6',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100e9fce8984a9f0cb76642c6df63a83150aa31d1071b62debe89ecadd4d45e727e02205a87fcaad0dd188860db8053caf7d6a21ed7807dbcd1560c251f9a91a4f36815412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '36207',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04657461624c9104eaa5cbe6e13db7d91f35dca5d270c944a9a3e8c7738c56d12069312f589c7f193e67ea3d2f6d1f300f404c33c19e48dc3ac35145c8152624b7a8e22278e9133862425da2cc44f7297c8618ffa78dd09054a4a5490afd2b62139f19fa7b8516cbae692488fa50e79101d55e7582b3a662c3a5cc737044ef392f8c1fde63b8385886aed37d1b68e887284262f298fe74c0',
                    },
                    {
                        value: '1100',
                        outputScript:
                            '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
                    },
                    {
                        value: '34652',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                lockTime: 0,
                timeFirstSeen: '1664909877',
                size: 388,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '11',
                    isEtokenTx: false,
                    legacy: {
                        amountSent: 0,
                        amountReceived: '11',
                        outgoingTx: false,
                        tokenTx: false,
                        airdropFlag: false,
                        airdropTokenId: '',
                        opReturnMessage: 'Test encrypted message',
                        isCashtabMessage: true,
                        isEncryptedMessage: true,
                        decryptionSuccess: true,
                        replyAddress:
                            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    },
                },
            },
            {
                txid: '45411aa786288b679d1c1874f7b126d5ea0c83380304950d364b5b8279a460de',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '60c6ad832e8f44ea59bb15166959b45828d8aec5554a2f70491dddf82dcda837',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402200a850b9bf5648bcca5811739fd22586b96460c1939d271b85d2906e31dff30ca0220536d5ab96f0fb4f488d9a4613849d2b212dcb7b755c296e92d11729ee2f939994121038c4c26730d97cdeb18e69dff6c47cebb23e6f305c950923cd6110f35ab9006d0',
                        outputScript:
                            '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
                        value: '50000',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1100',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        value: '48445',
                        outputScript:
                            '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
                    },
                ],
                lockTime: 0,
                timeFirstSeen: '1664909836',
                size: 225,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: false,
                    xecAmount: '11',
                    isEtokenTx: false,
                    legacy: {
                        amountSent: '11',
                        amountReceived: 0,
                        outgoingTx: true,
                        tokenTx: false,
                        airdropFlag: false,
                        airdropTokenId: '',
                        opReturnMessage: '',
                        isCashtabMessage: false,
                        isEncryptedMessage: false,
                        decryptionSuccess: false,
                        replyAddress:
                            'ecash:qrhxmjw5p72a3cgx5cect3h63q5erw0gfcvjnyv7xt',
                    },
                },
            },
            {
                txid: '60c6ad832e8f44ea59bb15166959b45828d8aec5554a2f70491dddf82dcda837',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100bc373f3fb8dc16b58c9138e8c884ace57e380d7787cf566f5889456a3fd1fd4202200346e070bfbf1d58aeb117890b3d9d5ff4927ee001b98f80f3b35babb486790d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '1822907',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '50000',
                        outputScript:
                            '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
                        spentBy: {
                            txid: '45411aa786288b679d1c1874f7b126d5ea0c83380304950d364b5b8279a460de',
                            outIdx: 0,
                        },
                    },
                    {
                        value: '1772452',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                lockTime: 0,
                timeFirstSeen: '1664909791',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '500',
                    isEtokenTx: false,
                    legacy: {
                        amountSent: 0,
                        amountReceived: '500',
                        outgoingTx: false,
                        tokenTx: false,
                        airdropFlag: false,
                        airdropTokenId: '',
                        opReturnMessage: '',
                        isCashtabMessage: false,
                        isEncryptedMessage: false,
                        decryptionSuccess: false,
                        replyAddress:
                            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    },
                },
            },
        ],
    },
};
export const mockSwapWallet = {
    mnemonic: '',
    name: 'tx-history-tests',
    Path245: {
        publicKey:
            '03b07958256f978e90669c4382b0be09caa05f847716746b3052cd6145df6062c1',
        hash160: '056d6d7e88f008de89ee53fa8b6fe10ffe10271f',
        cashAddress: 'bitcoincash:qqzk6mt73rcq3h5faefl4zm0uy8luyp8run6d3js23',
        slpAddress: 'simpleledger:qqzk6mt73rcq3h5faefl4zm0uy8luyp8rulpx28s50',
        fundingWif: '',
        fundingAddress:
            'simpleledger:qqzk6mt73rcq3h5faefl4zm0uy8luyp8rulpx28s50',
        legacyAddress: '1VhU8XuKS7ihzt8WZW41FzwM4aqVTKMqH',
    },
    Path145: {
        publicKey:
            '0378e3a893ea4f69fe710baf0623562078cfe84f7650c8379cd32d6a76e3cb5d82',
        hash160: '46d48362f35519ff656a3a5ca8cd43755efa74d1',
        cashAddress: 'bitcoincash:qprdfqmz7d23nlm9dga9e2xdgd64a7n56y3zmmxyjp',
        slpAddress: 'simpleledger:qprdfqmz7d23nlm9dga9e2xdgd64a7n56yaesqnyvl',
        fundingWif: '',
        fundingAddress:
            'simpleledger:qprdfqmz7d23nlm9dga9e2xdgd64a7n56yaesqnyvl',
        legacyAddress: '17TWt79xyS72UBHoxgb6xfnCaHQXd4zHyh',
    },
    Path1899: {
        publicKey:
            '0358a2f0ed38317f63de8400515ec376517d4020ca121a5b71e56d19028d6fee27',
        hash160: 'a7d744e1246a20f26238e0510fb82d8df84cc82d',
        cashAddress: 'bitcoincash:qznaw38py34zpunz8rs9zrac9kxlsnxg95m2sf5czz',
        slpAddress: 'simpleledger:qznaw38py34zpunz8rs9zrac9kxlsnxg95h3mjpcuu',
        fundingWif: '',
        fundingAddress:
            'simpleledger:qznaw38py34zpunz8rs9zrac9kxlsnxg95h3mjpcuu',
        legacyAddress: '1GJTjC9c5o3G7LJEGfgqzghGY6ecrwLAG9',
    },
    state: {
        balances: {
            totalBalanceInSatoshis: '1997',
            totalBalance: '19.97',
        },
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '0417094d2011c967e2ad8fe917415876f2e6a249bb486edb638d5659920a88ee',
                    outIdx: 0,
                },
                blockHeight: 767064,
                isCoinbase: false,
                value: '997',
                network: 'XEC',
                address:
                    'bitcoincash:qznaw38py34zpunz8rs9zrac9kxlsnxg95m2sf5czz',
            },
            {
                outpoint: {
                    txid: '2f030de7c8f80a1ecac3645092dd22f0943c34d54cb734e12d7dfda0641fdfcf',
                    outIdx: 3,
                },
                blockHeight: 767064,
                isCoinbase: false,
                value: '1000',
                slpMeta: {
                    tokenType: 'FUNGIBLE',
                    txType: 'SEND',
                    tokenId:
                        '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                },
                network: 'XEC',
                address:
                    'bitcoincash:qznaw38py34zpunz8rs9zrac9kxlsnxg95m2sf5czz',
            },
        ],
        parsedTxHistory: [],
    },
};
export const txHistoryTokenInfoById = {
    'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd': {
        tokenTicker: 'ST',
        tokenName: 'ST',
        tokenDocumentUrl: 'developer.bitcoin.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd',
    },
    'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1': {
        tokenTicker: 'CTP',
        tokenName: 'Cash Tab Points',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
    },
    '1f6a65e7a4bde92c0a012de2bcf4007034504a765377cdf08a3ee01d1eaa6901': {
        tokenTicker: '🍔',
        tokenName: 'Burger',
        tokenDocumentUrl:
            'https://c4.wallpaperflare.com/wallpaper/58/564/863/giant-hamburger-wallpaper-preview.jpg',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '1f6a65e7a4bde92c0a012de2bcf4007034504a765377cdf08a3ee01d1eaa6901',
    },
    'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d': {
        tokenTicker: 'TAP',
        tokenName: 'Thoughts and Prayers',
        tokenDocumentUrl: '',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
    },
    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e': {
        tokenTicker: 'TBC',
        tokenName: 'tabcash',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
    },
    'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb': {
        tokenTicker: 'NAKAMOTO',
        tokenName: 'NAKAMOTO',
        tokenDocumentUrl: '',
        tokenDocumentHash: '',
        decimals: 8,
        tokenId:
            'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
    },
    '22f4ba40312ea3e90e1bfa88d2aa694c271d2e07361907b6eb5568873ffa62bf': {
        tokenTicker: 'CLA',
        tokenName: 'Cashtab Local Alpha',
        tokenDocumentUrl: 'boomertakes.com',
        tokenDocumentHash: '',
        decimals: 5,
        tokenId:
            '22f4ba40312ea3e90e1bfa88d2aa694c271d2e07361907b6eb5568873ffa62bf',
    },
    'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0': {
        tokenTicker: 'SA',
        tokenName: 'Spinner Alpha',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
    },
    '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875': {
        tokenTicker: 'LVV',
        tokenName: 'Lambda Variant Variants',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
    },
    '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4': {
        tokenTicker: 'CGEN',
        tokenName: 'Cashtab Genesis',
        tokenDocumentUrl: 'https://boomertakes.com/',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
    },
    'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba': {
        tokenTicker: 'TBS',
        tokenName: 'TestBits',
        tokenDocumentUrl: 'https://thecryptoguy.com/',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
    },
    'aa7202397a06097e8ff36855aa72c0ee032659747e5bd7cbcd3099fc3a62b6b6': {
        tokenTicker: 'CTL',
        tokenName: 'Cashtab Token Launch Launch Token',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'aa7202397a06097e8ff36855aa72c0ee032659747e5bd7cbcd3099fc3a62b6b6',
    },
    '9e9738e9ac3ff202736bf7775f875ebae6f812650df577a947c20c52475e43da': {
        tokenTicker: 'CUTT',
        tokenName: 'Cashtab Unit Test Token',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 2,
        tokenId:
            '9e9738e9ac3ff202736bf7775f875ebae6f812650df577a947c20c52475e43da',
    },
    'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a': {
        tokenTicker: 'POW',
        tokenName: 'ProofofWriting.com Token',
        tokenDocumentUrl: 'https://www.proofofwriting.com/26',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
    },
    '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1': {
        tokenTicker: 'HONK',
        tokenName: 'HONK HONK',
        tokenDocumentUrl: 'THE REAL HONK SLP TOKEN',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
    },
    '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9': {
        tokenTicker: '001',
        tokenName: '01',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
    },
    '6fb6122742cac8fd1df2d68997fdfa4c077bc22d9ef4a336bfb63d24225f9060': {
        tokenTicker: '002',
        tokenName: '2',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '6fb6122742cac8fd1df2d68997fdfa4c077bc22d9ef4a336bfb63d24225f9060',
    },
    '2936188a41f22a3e0a47d13296147fb3f9ddd2f939fe6382904d21a610e8e49c': {
        tokenTicker: '002',
        tokenName: '2',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '2936188a41f22a3e0a47d13296147fb3f9ddd2f939fe6382904d21a610e8e49c',
    },
    'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b': {
        tokenTicker: 'test',
        tokenName: 'test',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 1,
        tokenId:
            'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b',
    },
    'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c': {
        tokenTicker: 'Service',
        tokenName: 'Evc token',
        tokenDocumentUrl: 'https://cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
    },
    '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d': {
        tokenTicker: 'WDT',
        tokenName:
            'Test Token With Exceptionally Long Name For CSS And Style Revisions',
        tokenDocumentUrl:
            'https://www.ImpossiblyLongWebsiteDidYouThinkWebDevWouldBeFun.org',
        tokenDocumentHash:
            '85b591c15c9f49531e39fcfeb2a5a26b2bd0f7c018fb9cd71b5d92dfb732d5cc',
        decimals: 7,
        tokenId:
            '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
    },
    '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b': {
        tokenTicker: 'COVID',
        tokenName: 'COVID-19',
        tokenDocumentUrl: 'https://en.wikipedia.org/wiki/COVID-19',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
    },
    '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc': {
        tokenTicker: 'CLT',
        tokenName: 'Cashtab Local Tests',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
    },
    '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96': {
        tokenTicker: 'CPG',
        tokenName: 'Cashtab Prod Gamma',
        tokenDocumentUrl: 'thecryptoguy.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96',
    },
    '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6': {
        tokenTicker: 'CLNSP',
        tokenName: 'ComponentLongNameSpeedLoad',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6',
    },
    'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55': {
        tokenTicker: 'CTB',
        tokenName: 'CashTabBits',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
    },
    'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f': {
        tokenTicker: 'XGB',
        tokenName: 'Garmonbozia',
        tokenDocumentUrl: 'https://twinpeaks.fandom.com/wiki/Garmonbozia',
        tokenDocumentHash: '',
        decimals: 8,
        tokenId:
            'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
    },
    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3': {
        tokenTicker: 'NOCOVID',
        tokenName: 'Covid19 Lifetime Immunity',
        tokenDocumentUrl:
            'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
    },
    'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc': {
        tokenTicker: 'CTD',
        tokenName: 'Cashtab Dark',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
    },
    '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a': {
        tokenTicker: 'XBIT',
        tokenName: 'eBits',
        tokenDocumentUrl: 'https://boomertakes.com/',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
    },
    '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8': {
        tokenTicker: 'CLB',
        tokenName: 'Cashtab Local Beta',
        tokenDocumentUrl: 'boomertakes.com',
        tokenDocumentHash: '',
        decimals: 2,
        tokenId:
            '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8',
    },
    '44929ff3b1fc634f982fede112cf12b21199a2ebbcf718412a38de9177d77168': {
        tokenTicker: 'coin',
        tokenName: 'johncoin',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '44929ff3b1fc634f982fede112cf12b21199a2ebbcf718412a38de9177d77168',
    },
    '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25': {
        tokenTicker: 'CFL',
        tokenName: 'Cashtab Facelift',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25',
    },
    'd376ebcd518067c8e10c0505865cf7336160b47807e6f1a95739ba90ae838840': {
        tokenTicker: 'CFL',
        tokenName: 'Cashtab Facelift',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'd376ebcd518067c8e10c0505865cf7336160b47807e6f1a95739ba90ae838840',
    },
    'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0': {
        tokenTicker: 'KAT',
        tokenName: 'KA_Test',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0',
    },
    'b39fdb53e21d67fa5fd3a11122f1452f15884047f2b80e8efe633c3b520b7a39': {
        tokenTicker: 'SCΩΩG',
        tokenName: 'Scoogi Omega',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'b39fdb53e21d67fa5fd3a11122f1452f15884047f2b80e8efe633c3b520b7a39',
    },
    '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577': {
        tokenTicker: 'OMI',
        tokenName: 'Omicron',
        tokenDocumentUrl: 'cdc.gov',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577',
    },
    '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917': {
        tokenTicker: 'CTL2',
        tokenName: 'Cashtab Token Launch Launch Token v2',
        tokenDocumentUrl: 'thecryptoguy.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
    },
    '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524': {
        tokenTicker: 'CBB',
        tokenName: 'Cashtab Beta Bits',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524',
    },
    '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8': {
        tokenTicker: 'IFP',
        tokenName: 'Infrastructure Funding Proposal Token',
        tokenDocumentUrl: 'ifp.cash',
        tokenDocumentHash:
            'b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553',
        decimals: 8,
        tokenId:
            '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8',
    },
    'e4e1a2fb071fa71ca727e08ed1d8ea52a9531c79d1e5f1ebf483c66b71a8621c': {
        tokenTicker: 'CPA',
        tokenName: 'Cashtab Prod Alpha',
        tokenDocumentUrl: 'thecryptoguy.com',
        tokenDocumentHash: '',
        decimals: 8,
        tokenId:
            'e4e1a2fb071fa71ca727e08ed1d8ea52a9531c79d1e5f1ebf483c66b71a8621c',
    },
    '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6': {
        tokenTicker: 'CMA',
        tokenName: 'CashtabMintAlpha',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 5,
        tokenId:
            '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6',
    },
    '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55': {
        tokenTicker: 'CKA',
        tokenName: 'Chronik Alpha',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 8,
        tokenId:
            '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
    },
    '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6': {
        tokenTicker: 'CTLv3',
        tokenName: 'Cashtab Token Launch Launch Token v3',
        tokenDocumentUrl: 'coinex.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
    },
    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48': {
        tokenTicker: 'DVV',
        tokenName: 'Delta Variant Variants',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
    },
    'bfddfcfc9fb9a8d61ed74fa94b5e32ccc03305797eea461658303df5805578ef': {
        tokenTicker: 'Sending Token',
        tokenName: 'Sending Token',
        tokenDocumentUrl: 'developer.bitcoin.com',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            'bfddfcfc9fb9a8d61ed74fa94b5e32ccc03305797eea461658303df5805578ef',
    },
    '55180a2527901ed4d7ef8f4d61d38d3543b0e7ac3aba04e7f4d3165c3320a6da': {
        tokenTicker: 'cARRRl',
        tokenName: 'Dachshund Pirate Token',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '55180a2527901ed4d7ef8f4d61d38d3543b0e7ac3aba04e7f4d3165c3320a6da',
    },
    '6a9305a13135625f4b533256e8d2e21a7343005331e1839348a39040f61e09d3': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Alpha',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '6a9305a13135625f4b533256e8d2e21a7343005331e1839348a39040f61e09d3',
    },
    '48090bcd94cf53289ce84e1d4aeb8035f6ea7d80d37baa6343d0f71e7d67a3ef': {
        tokenTicker: 'WP5',
        tokenName: 'Webpack 5',
        tokenDocumentUrl: 'boomertakes.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '48090bcd94cf53289ce84e1d4aeb8035f6ea7d80d37baa6343d0f71e7d67a3ef',
    },
    '27277911435164c511c7dbc3ef00ba5ce9edf8c1ccab93681cb0ad984b801ef1': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Alpha',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '27277911435164c511c7dbc3ef00ba5ce9edf8c1ccab93681cb0ad984b801ef1',
    },
    'a3add503bba986398b39fa2200ce658423a597b4f7fe9de04a2da4501f8b05a3': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Gamma',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'a3add503bba986398b39fa2200ce658423a597b4f7fe9de04a2da4501f8b05a3',
    },
    '8b402aab7682e1cef3da83bf754ae722cc95c3118dfe6e2149267f9a9e2ecc63': {
        tokenTicker: 'AUG5',
        tokenName: 'August 5',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '8b402aab7682e1cef3da83bf754ae722cc95c3118dfe6e2149267f9a9e2ecc63',
    },
    '2502bdc75d3afdce0742505d53e6d50cefb1268d7c2a835c06b701702b79e1b8': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Epsilon',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '2502bdc75d3afdce0742505d53e6d50cefb1268d7c2a835c06b701702b79e1b8',
    },
    'f29939b961d8f3b27d7826e3f22451fcf9273ac84421312a20148b1e083a5bb0': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Beta',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'f29939b961d8f3b27d7826e3f22451fcf9273ac84421312a20148b1e083a5bb0',
    },
    'edb693529851379bcbd75008f78940df8232510e6a1c64d8dc81693ae2a53f66': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Eta',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'edb693529851379bcbd75008f78940df8232510e6a1c64d8dc81693ae2a53f66',
    },
    'c70d5f036368e184d2a52389b2f4c2471855aebaccbd418db24d4515ce062dbe': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Zeta',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'c70d5f036368e184d2a52389b2f4c2471855aebaccbd418db24d4515ce062dbe',
    },
    'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7': {
        tokenTicker: 'SRM',
        tokenName: 'Server Redundancy Mint',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7',
    },
    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484': {
        tokenTicker: 'Alita',
        tokenName: 'Alita',
        tokenDocumentUrl: 'alita.cash',
        tokenDocumentHash: '',
        decimals: 4,
        tokenId:
            '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
    },
    'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50': {
        tokenTicker: 'UDT',
        tokenName: 'UpdateTest',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 7,
        tokenId:
            'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
    },
};
export const stakingRwd = {
    tx: {
        txid: 'c8b0783e36ab472f26108007ffa522ee82b79db3777c84b0448f5b9ef35be895',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: '0000000000000000000000000000000000000000000000000000000000000000',
                    outIdx: 4294967295,
                },
                inputScript:
                    '03f07d0c0439e5546508edc754ac9b2939000c736f6c6f706f6f6c2e6f7267',
                value: '0',
                sequenceNo: 0,
            },
        ],
        outputs: [
            {
                value: '362505204',
                outputScript:
                    '76a914f4728f398bb962656803346fb4ac45d776041a2e88ac',
                spentBy: {
                    txid: '6a26b853ba356cdc4a927c43afe33f03d30ef2367bd1f2c190a8c2e15f77fb6d',
                    outIdx: 1,
                },
            },
            {
                value: '200002871',
                outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
            },
            {
                value: '62500897',
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        lockTime: 0,
        block: {
            height: 818672,
            hash: '000000000000000009520291eb09aacd13b7bb802f329b584dafbc036a15b4cb',
            timestamp: '1700062633',
        },
        timeFirstSeen: '0',
        size: 182,
        isCoinbase: true,
        network: 'XEC',
    },
    parsed: {
        incoming: true,
        xecAmount: '625008.97',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'N/A',
    },
};
export const incomingXec = {
    tx: {
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '517521',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '4200',
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
            {
                value: '512866',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1652811898',
        network: 'XEC',
    },
    parsed: {
        incoming: true,
        xecAmount: '42',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    },
};
export const outgoingXec = {
    tx: {
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
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                value: '4400000',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '22200',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                value: '4377345',
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1652823464',
        network: 'XEC',
    },
    parsed: {
        incoming: false,
        xecAmount: '222',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
    },
};
export const aliasRegistration = {
    tx: {
        txid: 'f64608b13daf977008cfb96eb97082014c11cad5575956591a7ac9832d4fca9c',
        version: 2,
        inputs: [
            {
                prevOut: [Object],
                inputScript:
                    '48304502210087cd61371447a4e8426b86ea9c8643a94a378701c436e7d88b46eb64886a2c9d02201943c4b17eed65e37153659edff07aede69c1695254fe811180d616809daacf74121028bd858b877988795ed097c6e6230363450a3ceda58b15b0a76f0113d933c10a6',
                outputScript:
                    '76a914dc1147663948f0dcfb00cc407eda41b121713ad388ac',
                value: '20105',
                sequenceNo: 4294967295,
                slpBurn: undefined,
                slpToken: undefined,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a042e7865630004627567321500dc1147663948f0dcfb00cc407eda41b121713ad3',
                slpToken: undefined,
                spentBy: undefined,
            },
            {
                value: '555',
                outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                slpToken: undefined,
                spentBy: undefined,
            },
            {
                value: '19095',
                outputScript:
                    '76a914dc1147663948f0dcfb00cc407eda41b121713ad388ac',
                slpToken: undefined,
                spentBy: undefined,
            },
        ],
        lockTime: 0,
        slpTxData: undefined,
        slpErrorMsg: undefined,
        block: undefined,
        timeFirstSeen: '1696335229',
        size: 267,
        isCoinbase: false,
        network: 'XEC',
    },
    parsed: {
        incoming: false,
        xecAmount: '5.55',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: 'bug2',
        replyAddress: 'ecash:qrwpz3mx89y0ph8mqrxyqlk6gxcjzuf66vc4ajscad',
    },
};
export const incomingEtoken = {
    tx: {
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
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
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                slpToken: {
                    amount: '12',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '228',
                    isMintBaton: false,
                },
            },
            {
                value: '3889721',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
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
    },
    parsed: {
        incoming: true,
        xecAmount: '5.46',
        isEtokenTx: true,
        isTokenBurn: false,
        slpMeta: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
        },
        genesisInfo: {
            decimals: 0,
            success: true,
            tokenDocumentHash: '',
            tokenDocumentUrl:
                'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenName: 'Covid19 Lifetime Immunity',
            tokenTicker: 'NOCOVID',
        },
        etokenAmount: '12',
        airdropFlag: false,
        airdropTokenId: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    },
};
export const outgoingEtoken = {
    tx: {
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
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
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
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '17',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                slpToken: {
                    amount: '52',
                    isMintBaton: false,
                },
            },
            {
                value: '450745331',
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
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
    },
    parsed: {
        incoming: false,
        xecAmount: '5.46',
        isEtokenTx: true,
        isTokenBurn: false,
        slpMeta: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
        },
        genesisInfo: {
            decimals: 0,
            success: true,
            tokenDocumentHash: '',
            tokenDocumentUrl:
                'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenName: 'Covid19 Lifetime Immunity',
            tokenTicker: 'NOCOVID',
        },
        etokenAmount: '17',
        airdropFlag: false,
        airdropTokenId: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
    },
};
export const genesisTx = {
    tx: {
        txid: 'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100ab2a1e04a156e9cc5204e11e77ba399347f3b7ea3e05d45897c7fb7c6854a7ff022065c7e096e0526a0af223ce32e5e162aa577c42f7da231c13e28ebc3532396f20412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '1300',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010747454e45534953035544540a557064617465546573741468747470733a2f2f636173687461622e636f6d2f4c0001074c000800000001cf977871',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '7777777777',
                    isMintBaton: false,
                },
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'GENESIS',
                tokenId:
                    'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
            },
            genesisInfo: {
                tokenTicker: 'UDT',
                tokenName: 'UpdateTest',
                tokenDocumentUrl: 'https://cashtab.com/',
                tokenDocumentHash: '',
                decimals: 7,
            },
        },
        block: {
            height: 759037,
            hash: '00000000000000000bc95bfdd45e71585f27139e71b56dd5bc86ef05d35b502f',
            timestamp: '1664226709',
        },
        timeFirstSeen: '1664226189',
        size: 268,
        isCoinbase: false,
        network: 'XEC',
    },
    parsed: {
        incoming: false,
        xecAmount: '0',
        isEtokenTx: true,
        isTokenBurn: false,
        etokenAmount: '777.7777777',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'GENESIS',
            tokenId:
                'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
        },
        genesisInfo: {
            decimals: 7,
            success: true,
            tokenDocumentHash: '',
            tokenDocumentUrl: 'https://cashtab.com/',
            tokenId:
                'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
            tokenName: 'UpdateTest',
            tokenTicker: 'UDT',
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    },
};
export const incomingEtokenNineDecimals = {
    tx: {
        txid: 'b808f6a831dcdfda2bd4c5f857f94e1a746a4effeda6a5ad742be6137884a4fb',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 3,
                },
                inputScript:
                    '4830450221009d649476ad963306a5210d9df2dfd7e2bb604be43d6cdfe359638d96239973eb02200ac6e71575f0f111dad2fbbeb2712490cc709ffe03eda7de33acc8614b2c0979412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3503',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '82d8dc652779f8d6c8453d2ba5aefec91f5247489246e5672cf3c5986fa3d235',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100b7bec6d09e71bc4c124886e5953f6e7a7845c920f66feac2e9e5d16fc58a649a0220689d617c11ef0bd63dbb7ea0fa5c0d3419d6500535bda8f7a7fc3e27f27c3de6412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '9876543156',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e4420acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f550800000000075bcd1508000000024554499f',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '123456789',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '9753086367',
                    isMintBaton: false,
                },
            },
            {
                value: '1685',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            },
        },
        timeFirstSeen: '1664837660',
        size: 481,
        isCoinbase: false,
        network: 'XEC',
    },
    parsed: {
        incoming: true,
        xecAmount: '5.46',
        isEtokenTx: true,
        isTokenBurn: false,
        etokenAmount: '0.123456789',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
        },
        genesisInfo: {
            decimals: 9,
            success: true,
            tokenDocumentHash: '',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenId:
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            tokenName: 'CashTabBits',
            tokenTicker: 'CTB',
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    },
};
export const legacyAirdropTx = {
    tx: {
        txid: '6e3baf279770c3ed84981c414f433e654cdc1b12df3024051f0f7c215a13dca9',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '806abb677534eaa3b61ca050b65d4159d64e442699dd5460be87786f973bc079',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207acf2b13eb099b42edf2d985afc4da3123a76e3120a66cd2e915fdd93b9ce243022055529f4f4db28c2d3b3ce98fd55dd539c92f0790d36cf8a63a4fbb89eb602b2a412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                value: '1595',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'c257bdccd3804de5ce1359d986488902d73e11156e544ca9eaf15d9d3878a83c',
                    outIdx: 111,
                },
                inputScript:
                    '47304402205f670a5afb2b6cb10ae86818f50c0dd9a9bc639e979a3325ab8834c5631ac81b022078ce9092a5ded4afe261f1b311e5619f1f8673ace9de5dae3441f33834ecb33a412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                value: '22600',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '8db1137ec2cdaa0c5a93c575352eaf024ce304f189c91094cc6b711be876dff4',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100cca98ffbd5034f1f07c459a2f7b694d0bfc8cd9c0f33fe0b45d5914a10b034610220592d50dd5f1fea5c1d689909e61d1d1bfad21ea6a42a01ba7d4e9428baedca06412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                value: '170214',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
                },
            },
            {
                prevOut: {
                    txid: '5c7e9879f94258e7128f684c0be7786d9d2355c1f3b3ded5382e3a2745d9ec53',
                    outIdx: 111,
                },
                inputScript:
                    '483045022100fefd74866d212ff97b54fb4d6e588754b13d073b06200f255d891195fc57cb0502201948da90078778ab195c8adec213cc09972a1c89f8a35d10294894bcbf313941412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                value: '22583',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '6b86db3a0adb9963c3fbf911ad3935b611ea6224834f1664e0bdfc026fd57fc9',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100e4dde7a7d227f0631d042a1953e55400b00386050eff672832e557a4438f0f0b022060fd64cb142723578a4fd25c703d7afa0db045d981c75f770cb66b3b87ccc72a412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                value: '16250',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                },
            },
            {
                prevOut: {
                    txid: '81f52f89efc61072dcab4735f1a99b6648c8cc10314452185e728b383b170e30',
                    outIdx: 23,
                },
                inputScript:
                    '483045022100f057b22cbc643d6aa839d64c96eede889782e4738104dde84c5980089c75c9e702200449b7ad1e88141def532e3cd2943dfa29a9ede8a6d0b3283531dee085b867b1412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                value: '23567578',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a0464726f7020bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c04007461624565766320746f6b656e207365727669636520686f6c64657273206169722064726f70f09fa587f09f8c90f09fa587e29da4f09f918cf09f9bacf09f9bacf09f8d97f09fa4b4',
            },
            {
                value: '550',
                outputScript:
                    '76a9140352e2c246fa38fe57f6504dcff628a2ab85c9a888ac',
            },
            {
                value: '550',
                outputScript:
                    '76a9147d2acc561f417bf3265d465fbd76b7976cd35add88ac',
            },
            {
                value: '550',
                outputScript:
                    '76a91478a291a19347161a532f31cae95d492cc57965e888ac',
            },
            {
                value: '584',
                outputScript:
                    '76a91478cc64d09c2c558e2c7f1baf463f4e2a6246559888ac',
            },
            {
                value: '10027',
                outputScript:
                    '76a91471536340a5ad319f24ae433d7caa4475dd69faec88ac',
            },
            {
                value: '10427',
                outputScript:
                    '76a914649be1781f962c54f47273d58e31439fb452b92988ac',
            },
            {
                value: '560',
                outputScript:
                    '76a914be3ce499e31ebe80c7aabf673acd854c8969ddc488ac',
            },
            {
                value: '551',
                outputScript:
                    '76a914e88f39383c4d264410f30d2b28cdae775c67ea8e88ac',
            },
            {
                value: '557',
                outputScript:
                    '76a9145fbce9959ce7b712393138aef20b013d5a2802e688ac',
            },
            {
                value: '550',
                outputScript:
                    '76a91450f35e3861d60945efcd2b05f562eff14d28db1088ac',
            },
            {
                value: '10027',
                outputScript:
                    '76a914866ed8973e444d1f6533eb1858ca284ad589bc1988ac',
            },
            {
                value: '555',
                outputScript:
                    '76a9140848ee10a336bba27c7ee90dc4a1c2407178a5b788ac',
            },
            {
                value: '550',
                outputScript:
                    '76a9149750cdddb976b8466668a73b58c0a1afbd6f4db888ac',
            },
            {
                value: '560',
                outputScript:
                    '76a9148ee151bf0f1637cdd2e1b41ed2cd32b0df0a932588ac',
            },
            {
                value: '590',
                outputScript:
                    '76a914be792ef52fb6bc5adcabeb8eb604fbbb3dc4693488ac',
            },
            {
                value: '551',
                outputScript:
                    '76a9142ad96e467f9354f86e0c11acfde351194a183dc888ac',
            },
            {
                value: '550',
                outputScript:
                    '76a914afd2470f264252f1359d7b8093fff4fdd120c5f988ac',
            },
            {
                value: '584',
                outputScript:
                    '76a9148a8e920239fb5cc647855c1d634b0bbe4c4b670188ac',
            },
            {
                value: '569',
                outputScript:
                    '76a91412f84f54fad4695321f61c313d2e32a0a8f8086488ac',
            },
            {
                value: '584',
                outputScript:
                    '76a914842b152a0bbd4647afaeceec8a6afaa90668e7c788ac',
            },
            {
                value: '584',
                outputScript:
                    '76a914fe971eb2960defce93503c5641d54eaad2ab6a0588ac',
            },
            {
                value: '584',
                outputScript:
                    '76a914685e825961b67456f440caaaaab0f94cb3354b7288ac',
            },
            {
                value: '584',
                outputScript:
                    '76a91476b4447a3617e918d03261353e179a583f85d2c688ac',
            },
            {
                value: '584',
                outputScript: 'a91418bb4f7d8881c1d1457c33a6af8e5937f7f776a887',
            },
            {
                value: '584',
                outputScript:
                    '76a914b366ef7c1ffd4ef452d72556634720cc8741e1dc88ac',
            },
            {
                value: '553',
                outputScript:
                    '76a914f5e82dc01170d99a16bf9610da873df47f82aa7a88ac',
            },
            {
                value: '569',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '553',
                outputScript:
                    '76a9142ed681dc5421dd4a052f49bda55a9c345fb025e088ac',
            },
            {
                value: '584',
                outputScript:
                    '76a914b87d445b2dbba65c5a5bb79959b44c24593518f888ac',
            },
            {
                value: '553',
                outputScript: 'a9147d91dc783fb1c5b7f24befd92eedc8dabfa8ab7e87',
            },
            {
                value: '584',
                outputScript: 'a914f722fc8e23c5c23663aa3273f445b784b223aab587',
            },
            {
                value: '584',
                outputScript:
                    '76a914940840311cbe6013e59aff729ffc1d902fd74d1988ac',
            },
            {
                value: '584',
                outputScript:
                    '76a914d394d084607bce97fa4e661b6f2c7d2f237c89ee88ac',
            },
            {
                value: '558',
                outputScript:
                    '76a91470e1b34c51cd5319c5ca54da978a6422605e6b3e88ac',
            },
            {
                value: '556',
                outputScript:
                    '76a91440eeb036d9d6bc71cd65b91eb5bbfa5d808805ca88ac',
            },
            {
                value: '584',
                outputScript:
                    '76a9144d55f769ce14fd44e2b63500d95016838a5d130d88ac',
            },
            {
                value: '584',
                outputScript:
                    '76a914a17ee8562ede98dfe9cd00f7f84d74c4c9c58ee788ac',
            },
            {
                value: '584',
                outputScript:
                    '76a914a13fc3642d1e7293eb4b9f17ec1b6f6d7ea4aaeb88ac',
            },
            {
                value: '576',
                outputScript:
                    '76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac',
            },
            {
                value: '10427',
                outputScript:
                    '76a91486a911e65753b379774448230e7e8f7aeab8fa5e88ac',
            },
            {
                value: '552',
                outputScript:
                    '76a914e9364c577078f16ee2b27f2c570a4e450dd52e7a88ac',
            },
            {
                value: '1428',
                outputScript:
                    '76a914ed917afa96833c1fea678e23374c557ed83ff6ff88ac',
            },
            {
                value: '1427',
                outputScript:
                    '76a91482cf48aefcd80072ef21e4a61dee8c2d70d0bcb388ac',
            },
            {
                value: '9135',
                outputScript:
                    '76a91444e8388bdd64c1f67905279066f044638d0e166988ac',
            },
            {
                value: '1427',
                outputScript:
                    '76a914d62e68453b75938616b75309c3381d14d61cb9a488ac',
            },
            {
                value: '1427',
                outputScript:
                    '76a91425b1d2b4610b6deed8e3d2ac76f4f112883126e488ac',
            },
            {
                value: '921',
                outputScript:
                    '76a91456423795dc2fa85fa3931cdf9e58f4f8661c2b2488ac',
            },
            {
                value: '1843',
                outputScript:
                    '76a914e03d94e59bb300b965ac234a274b1cf41c3cadd788ac',
            },
            {
                value: '1584',
                outputScript:
                    '76a9141e0d6a8ef2c8a0f6ceace8656059ea9dbeb11bda88ac',
            },
            {
                value: '1843',
                outputScript:
                    '76a914f6cd6ef1bd7add314fd9b115c3ad0dce7844930c88ac',
            },
            {
                value: '560',
                outputScript:
                    '76a91488fb294f87b0f05bf6eddc1d6bfde2ba3a87bcdd88ac',
            },
            {
                value: '560',
                outputScript:
                    '76a914a154f00227476ec9741a416e96b69677fddf4b1d88ac',
            },
            {
                value: '1427',
                outputScript:
                    '76a914362a3773f5685c89e4b800e4c4f9925db2ec1b5c88ac',
            },
            {
                value: '584',
                outputScript:
                    '76a9146770958588049a3f39828e1ddc57f3dd77227a1188ac',
            },
            {
                value: '1708',
                outputScript:
                    '76a914b0313745d5f7c850c9682c2711b6a14f2db9276b88ac',
            },
            {
                value: '679',
                outputScript:
                    '76a914fe729aa40779f822a8c4988f49a115c8aabc0cc788ac',
            },
            {
                value: '1511',
                outputScript:
                    '76a914ecef001f3c137c880f828d843f754a082eb5396b88ac',
            },
            {
                value: '560',
                outputScript:
                    '76a91463e79addfc3ad33d04ce064ade02d3c8caca8afd88ac',
            },
            {
                value: '552',
                outputScript:
                    '76a91489a6da1ed86c8967f03691ad9af8d93c6259137388ac',
            },
            {
                value: '919',
                outputScript:
                    '76a9149fa178360cab170f9423223a5b166171f54d5bc188ac',
            },
            {
                value: '15000',
                outputScript:
                    '76a914bc37eb24817a8442b23ae9a06cc405c8fdf1e7c488ac',
            },
            {
                value: '560',
                outputScript:
                    '76a914e78d304632489ba240b29986fe6afd32c77aa16388ac',
            },
            {
                value: '570',
                outputScript:
                    '76a914993e6beef74f4ed0c3fe51af895e476ce37c362b88ac',
            },
            {
                value: '921329',
                outputScript:
                    '76a914b8820ca6b9ceb0f546e142ddd857a4974483719a88ac',
            },
            {
                value: '5100',
                outputScript:
                    '76a914ca989ff4d3df17fe4dc6eb330b469bd6d5d4814e88ac',
            },
            {
                value: '5200',
                outputScript:
                    '76a914ad29cdce2237f71e95fee551f04425f70b7e4c9d88ac',
            },
            {
                value: '584',
                outputScript:
                    '76a9140f57872e06e15593c8a288fcb761b13ca571d78888ac',
            },
            {
                value: '10266',
                outputScript:
                    '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
            },
            {
                value: '580',
                outputScript:
                    '76a9141e37634e6693e228801c194c45701d49a1d12e2c88ac',
            },
            {
                value: '22743016',
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                spentBy: {
                    txid: '7242d84b3db853262c53f4b068c57e5a52b67a8b6fea313e0a6f7f58df16e413',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 759800,
            hash: '00000000000000000f1afd00cb83bd94abb0bec8712e9ed90a2cac1e7a27e84a',
            timestamp: '1664667368',
        },
        timeFirstSeen: '1664667131',
        size: 3393,
        isCoinbase: false,
        network: 'XEC',
    },
    parsed: {
        incoming: true,
        xecAmount: '5.69',
        isEtokenTx: false,
        aliasFlag: false,
        airdropFlag: true,
        airdropTokenId:
            'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
        opReturnMessage: 'evc token service holders air drop🥇🌐🥇❤👌🛬🛬🍗🤴',
        isCashtabMessage: true,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qp36z7k8xt7k4l5xnxeypg5mfqeyvvyduu04m37fwd',
    },
};
export const outgoingEncryptedMsg = {
    tx: {
        txid: '7ac10096c8a7b32fe338dc938bcf2e1341b99f841687e690d88241107ce4b84b',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '45411aa786288b679d1c1874f7b126d5ea0c83380304950d364b5b8279a460de',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100d4a93c615a7af48f422c273a530ac7f2b78d31a2d4515f11b2f416fce4f4f380022075c22c73190a7de805f219ca8d294777440b558551fea6b59c6c84ec529b16f94121038c4c26730d97cdeb18e69dff6c47cebb23e6f305c950923cd6110f35ab9006d0',
                outputScript:
                    '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
                value: '48445',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04657461624ca1040f3cc3bc507126c239cde840befd974bdac054f9b9f2bfd4ff32b5f59ca554c4f3fb2d11d30eae3e5d3f61625ff7812ba14f8c901c30ee7e03dea57681a8f7ab8c64d42ce505921b4d67507452537cbe7525281714857c75d7a441b65030b7ea646b59ed0c34adc9f739661620cf7678963db3cac78afd7f49ad0d63aad404b07730255ded82ea3a939c63ee040ae9fac9336bb8d84d7b3380665ffa514a45f4',
            },
            {
                value: '1200',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                value: '46790',
                outputScript:
                    '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1664910083',
        size: 404,
        isCoinbase: false,
        network: 'XEC',
    },
    parsed: {
        incoming: false,
        xecAmount: '12',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        opReturnMessage: 'Only the message recipient can view this',
        isCashtabMessage: true,
        isEncryptedMessage: true,
        replyAddress: 'ecash:qrhxmjw5p72a3cgx5cect3h63q5erw0gfcvjnyv7xt',
    },
};
export const incomingEncryptedMsg = {
    tx: {
        txid: '66974f4a22ca1a4aa36c932b4effafcb9dd8a32b8766dfc7644ba5922252c4c6',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100e9fce8984a9f0cb76642c6df63a83150aa31d1071b62debe89ecadd4d45e727e02205a87fcaad0dd188860db8053caf7d6a21ed7807dbcd1560c251f9a91a4f36815412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '36207',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04657461624c9104eaa5cbe6e13db7d91f35dca5d270c944a9a3e8c7738c56d12069312f589c7f193e67ea3d2f6d1f300f404c33c19e48dc3ac35145c8152624b7a8e22278e9133862425da2cc44f7297c8618ffa78dd09054a4a5490afd2b62139f19fa7b8516cbae692488fa50e79101d55e7582b3a662c3a5cc737044ef392f8c1fde63b8385886aed37d1b68e887284262f298fe74c0',
            },
            {
                value: '1100',
                outputScript:
                    '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
            },
            {
                value: '34652',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1664909877',
        size: 388,
        isCoinbase: false,
        network: 'XEC',
    },
    parsed: {
        incoming: true,
        xecAmount: '11',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        opReturnMessage: 'Encrypted Cashtab Msg',
        isCashtabMessage: true,
        isEncryptedMessage: true,
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    },
};
export const tokenBurn = {
    tx: {
        txid: '312553668f596bfd61287aec1b7f0f035afb5ddadf40b6f9d1ffcec5b7d4b684',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                    outIdx: 0,
                },
                inputScript:
                    '473044022025c68cf0ab9c1a4d6b35b2b58f7e397722f469412841eb09d38d1973dc5ef7120220712e1f3c8740fff2af75c1062a773eef167550ee008deaef9089537cd17c35f0412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '2300',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '1efe359a0bfa83c409433c487b025fb446a3a9bfa51a718c8dd9a56401656e33',
                    outIdx: 2,
                },
                inputScript:
                    '47304402206a2f53497eb734ea94ca158951aa005f6569c184675a497d33d061b78c66c25b02201f826fa71be5943ce63740d92a278123974e44846c3766c5cb58ef5ad307ba36412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '2',
                    isMintBaton: false,
                },
            },
            {
                prevOut: {
                    txid: '49f825370128056333af945eb4f4d9712171c9e88954deb189ca6f479564f2ee',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100efa3c767b749abb2dc958932348e2b19b845964e581c9f6de706cd43dac3f087022059afad6ff3c1e49cc0320499381e78eab922f18b00e0409228ad417e0220bf5d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '546',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '12',
                        isMintBaton: false,
                    },
                    tokenId:
                        '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                },
                slpToken: {
                    amount: '999875',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c8750800000000000f41b9',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '999865',
                    isMintBaton: false,
                },
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
            },
        },
        timeFirstSeen: '1664919857',
        size: 550,
        isCoinbase: false,
        network: 'XEC',
    },
    parsed: {
        incoming: false,
        xecAmount: '0',
        isEtokenTx: true,
        isTokenBurn: true,
        etokenAmount: '12',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
        },
        genesisInfo: {
            tokenTicker: 'LVV',
            tokenName: 'Lambda Variant Variants',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenDocumentHash: '',
            decimals: 0,
            tokenId:
                '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
            success: true,
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    },
};
export const tokenBurnDecimals = {
    tx: {
        txid: 'dacd4bacb46caa3af4a57ac0449b2cb82c8a32c64645cd6a64041287d1ced556',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207122751937862fad68c3e293982cf7afb91967d20da63a0c23bf0565b625b775022054f39f41a43438a0df7fbe6a78521f572613bc08d6a43b6d248bcb6a434e2b52412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '905cc5662cad77df56c3770863634ce498dde9d4772dc494d33b7ce3f36fa66c',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100dce5b3b516bfebd40bd8d4b4ff9c43c685d3c9dde1def0cc0667389ac522cf2502202651f95638e48c210a04082e6053457a539aef0f65a2e9c2f61e3faf96c1dfd8412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '546',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '1234567',
                        isMintBaton: false,
                    },
                    tokenId:
                        '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                },
                slpToken: {
                    amount: '5235120760000000',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44207443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d0800129950892eb779',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '5235120758765433',
                    isMintBaton: false,
                },
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
            },
        },
        timeFirstSeen: '1664923127',
        size: 403,
        isCoinbase: false,
        network: 'XEC',
    },
    parsed: {
        incoming: false,
        xecAmount: '0',
        isEtokenTx: true,
        etokenAmount: '0.1234567',
        isTokenBurn: true,
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
        },
        genesisInfo: {
            tokenTicker: 'WDT',
            tokenName:
                'Test Token With Exceptionally Long Name For CSS And Style Revisions',
            tokenDocumentUrl:
                'https://www.ImpossiblyLongWebsiteDidYouThinkWebDevWouldBeFun.org',
            tokenDocumentHash:
                '85b591c15c9f49531e39fcfeb2a5a26b2bd0f7c018fb9cd71b5d92dfb732d5cc',
            decimals: 7,
            tokenId:
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
            success: true,
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    },
};
export const incomingEtokenTwo = {
    tx: {
        txid: 'b808f6a831dcdfda2bd4c5f857f94e1a746a4effeda6a5ad742be6137884a4fb',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 3,
                },
                inputScript:
                    '4830450221009d649476ad963306a5210d9df2dfd7e2bb604be43d6cdfe359638d96239973eb02200ac6e71575f0f111dad2fbbeb2712490cc709ffe03eda7de33acc8614b2c0979412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3503',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                },
            },
            {
                prevOut: {
                    txid: '82d8dc652779f8d6c8453d2ba5aefec91f5247489246e5672cf3c5986fa3d235',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100b7bec6d09e71bc4c124886e5953f6e7a7845c920f66feac2e9e5d16fc58a649a0220689d617c11ef0bd63dbb7ea0fa5c0d3419d6500535bda8f7a7fc3e27f27c3de6412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '9876543156',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e4420acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f550800000000075bcd1508000000024554499f',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '123456789',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '9753086367',
                    isMintBaton: false,
                },
            },
            {
                value: '1685',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            },
        },
        block: {
            height: 760076,
            hash: '00000000000000000bf1ee10a21cc4b784ea48840fa00237e41f69a027c6a86c',
            timestamp: '1664840266',
        },
        timeFirstSeen: '1664837660',
        size: 481,
        isCoinbase: false,
        network: 'XEC',
    },
    parsed: {
        incoming: true,
        xecAmount: '5.46',
        isEtokenTx: true,
        etokenAmount: '0.123456789',
        isTokenBurn: false,
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
        },
        genesisInfo: {
            tokenTicker: 'CTB',
            tokenName: 'CashTabBits',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenDocumentHash: '',
            decimals: 9,
            tokenId:
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            success: true,
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    },
};
export const swapTx = {
    tx: {
        txid: '2f030de7c8f80a1ecac3645092dd22f0943c34d54cb734e12d7dfda0641fdfcf',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: '4e771bc4bbd377f05b467b0e070ff330f03112b9effb61af5568e174850afa1b',
                    outIdx: 1,
                },
                inputScript:
                    '41ff62002b741b8b4831484f9a214c72972965765dc398cccb2f9756a910415f89a28c3560b772a73cb6f987057a7204105cb8afab30a46e74308a134d15ceb48b4121038a124bbf306b5bd19e8d10a396a96ae18abe79229820f30e81989fd645cf0525',
                outputScript:
                    '76a91480ad93eff2bd02e6383ba62476ffd729d1b2660d88ac',
                value: '546',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'ffbe78a817d157a0debf3c6ee5e14cea8a2bd1cd0feaf8c368292b694110d7f4',
                    outIdx: 1,
                },
                inputScript:
                    '41a112ff6b2b9d288f507b48e042390b8b285bf761e617885eb9a536259c1bd1bec673325cebbf913d90ad0ec3237eac29e6592198cb52dcd6cf6786f784f5889e41210247295c2401b8846ddd915ba9808e0962241003baecd0242b3888d1b3182c2154',
                outputScript:
                    '76a91475c5980aa6eeada103b45f82e37163e9047903af88ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '10000',
                    isMintBaton: false,
                },
            },
            {
                prevOut: {
                    txid: '6684cb754ec82e4d9b9b068ab2191af8cfd0998da9f753c16fabb293664e45af',
                    outIdx: 0,
                },
                inputScript:
                    '41bb8866a6cd6975ec9fdd8c45860c6cee5f83c52c801f830b3a97a69b6a02762c73a71ef91ce519224eb7e62fc4eb895587231a258a8f368f007c6377e7ca0028412102744cf89c996b8ec7ea887a1c4d0e0f98a2c82f8a1e4956ed12d8c8dc8bb2f6e4',
                outputScript:
                    '76a914205c792fff2ffc891e986246760ee1079fa5a36988ac',
                value: '101670',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442054dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484080000000000002710',
            },
            {
                value: '546',
                outputScript:
                    '76a914205c792fff2ffc891e986246760ee1079fa5a36988ac',
                slpToken: {
                    amount: '10000',
                    isMintBaton: false,
                },
            },
            {
                value: '100546',
                outputScript:
                    '76a91480ad93eff2bd02e6383ba62476ffd729d1b2660d88ac',
            },
            {
                value: '1000',
                outputScript:
                    '76a914a7d744e1246a20f26238e0510fb82d8df84cc82d88ac',
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                tokenId:
                    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
            },
        },
        block: {
            height: 767064,
            hash: '0000000000000000018dacde348577244cca129a8787f1594ef3e2dff9831153',
            timestamp: '1669029608',
        },
        timeFirstSeen: '1669028713',
        size: 599,
        isCoinbase: false,
        network: 'XEC',
        parsed: {
            incoming: true,
            xecAmount: '10',
            isEtokenTx: false,
            airdropFlag: false,
            airdropTokenId: '',
            opReturnMessage: '',
            isCashtabMessage: false,
            isEncryptedMessage: false,
            decryptionSuccess: false,
            replyAddress: 'ecash:qqs9c7f0luhlezg7np3yvaswuyrelfdrdyfxzg8vh0',
        },
    },
    parsed: {
        incoming: true,
        xecAmount: '10',
        isEtokenTx: false,
        aliasFlag: false,
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qzq2myl0727s9e3c8wnzgahl6u5arvnxp5fs9sem4x',
    },
};
export const aliasOffSpec = {
    tx: {
        txid: '7b265a49e0bd5fe0c5e4b4aec634a25dd85656766a035b6e436c415538c43d90',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1be4bb9f820d60a82f6eb86a32ca9442700f180fc94469bca2ded9129f5dce88',
                    outIdx: 2,
                },
                inputScript:
                    '47304402205af9cf7ddb8412803b8e884dbd5cb02535ffc266fd5c6afb3e48e7425e7b215b0220799688d330130e4c7c7ffa33d9310e0bbc6fd820bbe26f7f47f52c17d79d6d4d4121022658400e1f93f3f491b6b8e98c0af1f45e30dd6a328894b7ea0569e0182c1e77',
                outputScript:
                    '76a914bc4932372bf33d57b3a21b2b2636919bc83a87a788ac',
                value: '3962985',
                sequenceNo: 4294967294,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a042e7865630d616e64616e6f746865726f6e65',
            },
            {
                value: '551',
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                spentBy: {
                    txid: '33805053250ab648e231ea61a70fc4027765c184c112cc0b83f05f7c9db6a4c5',
                    outIdx: 12,
                },
            },
            {
                value: '3961979',
                outputScript:
                    '76a914bc4932372bf33d57b3a21b2b2636919bc83a87a788ac',
                spentBy: {
                    txid: 'f299dfce0030f9a0cf6d104b95182d973cf46111cfb3daaebb62b44c25d3f134',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 778616,
            hash: '00000000000000000fc2761e52b21752aee12a0f36b339f669a195b00a4a172e',
            timestamp: '1675967591',
        },
        timeFirstSeen: '1675967197',
        size: 254,
        isCoinbase: false,
        network: 'XEC',
    },
    parsed: {
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: true,
        incoming: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        isEtokenTx: false,
        opReturnMessage: 'off-spec alias registration',
        replyAddress: 'ecash:qz7yjv3h90en64an5gdjkf3kjxdusw585u9j5rqxcg',
        xecAmount: '0',
    },
};
