export const validXecAirdropList =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,7\n' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,67\n' +
    'ecash:qqlkyzmeupf7q8t2ttf2u8xgyk286pg4wyz0v403dj,4376\n' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,673728\n' +
    'ecash:qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6,23673\n';

export const invalidXecAirdropList =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,7\n' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,3\n' +
    'ecash:qqlkyzmeupf7q8t2ttf2u8xgyk286pg4wyz0v403dj,4376\n' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,673728\n' +
    'ecash:qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6,23673\n';

export const invalidXecAirdropListMultipleInvalidValues =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,7\n' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,3,3,4\n' +
    'ecash:qqlkyzmeupf7q8t2ttf2u8xgyk286pg4wyz0v403dj,4,1,2\n' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,673728\n' +
    'ecash:qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6,23673\n';

export const invalidXecAirdropListMultipleValidValues =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,7\n' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,8,9,44\n' +
    'ecash:qqlkyzmeupf7q8t2ttf2u8xgyk286pg4wyz0v403dj,4376,43,1212\n' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,673728\n' +
    'ecash:qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6,23673\n';

export const validXecAirdropExclusionList =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,' +
    'ecash:qqlkyzmeupf7q8t2ttf2u8xgyk286pg4wyz0v403dj,' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,' +
    'ecash:qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6';

export const invalidXecAirdropExclusionList =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,' +
    'ecash:qqlqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqyz0v403dj,' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,' +
    'ecash:qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6';

export const validCashtabCache = {
    tokenInfoById: {
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
        'aa7202397a06097e8ff36855aa72c0ee032659747e5bd7cbcd3099fc3a62b6b6': {
            tokenTicker: 'CTL',
            tokenName: 'Cashtab Token Launch Launch Token',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenDocumentHash: '',
            decimals: 0,
            tokenId:
                'aa7202397a06097e8ff36855aa72c0ee032659747e5bd7cbcd3099fc3a62b6b6',
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
        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48': {
            tokenTicker: 'DVV',
            tokenName: 'Delta Variant Variants',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenDocumentHash: '',
            decimals: 0,
            tokenId:
                '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
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
        '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6': {
            tokenTicker: 'CTLv3',
            tokenName: 'Cashtab Token Launch Launch Token v3',
            tokenDocumentUrl: 'coinex.com',
            tokenDocumentHash: '',
            decimals: 0,
            tokenId:
                '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
        },
    },
};
export const cashtabCacheWithOneBadTokenId = {
    tokenInfoById: {
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
        'aa7202397a06097e8ff36855aa72c0ee032659747e5bd7cbcd3099fc3a62b6b6': {
            tokenTicker: 'CTL',
            tokenName: 'Cashtab Token Launch Launch Token',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenDocumentHash: '',
            decimals: 0,
            tokenId:
                'aa7202397a06097e8ff36855aa72c0ee032659747e5bd7cbcd3099fc3a62b6b6',
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
        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48': {
            tokenTicker: 'DVV',
            tokenName: 'Delta Variant Variants',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenDocumentHash: '',
            decimals: 0,
            tokenId:
                '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
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
        '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6': {
            tokenTicker: 'CTLv3',
            tokenName: 'Cashtab Token Launch Launch Token v3',
            tokenDocumentUrl: 'coinex.com',
            tokenDocumentHash: '',
            decimals: 0,
            tokenId:
                '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc',
        },
    },
};
export const cashtabCacheWithDecimalNotNumber = {
    tokenInfoById: {
        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3': {
            tokenTicker: 'NOCOVID',
            tokenName: 'Covid19 Lifetime Immunity',
            tokenDocumentUrl:
                'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
            tokenDocumentHash: '',
            decimals: '0',
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
        },
    },
};
export const cashtabCacheWithTokenNameNotString = {
    tokenInfoById: {
        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3': {
            tokenTicker: 'NOCOVID',
            tokenName: 888,
            tokenDocumentUrl:
                'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
            tokenDocumentHash: '',
            decimals: 0,
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
        },
    },
};
export const cashtabCacheWithMissingTokenName = {
    tokenInfoById: {
        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3': {
            tokenTicker: 'NOCOVID',
            tokenDocumentUrl:
                'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
            tokenDocumentHash: '',
            decimals: 0,
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
        },
    },
};
