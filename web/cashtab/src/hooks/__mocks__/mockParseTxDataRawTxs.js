// API result for getRawTransaction for the first vin txid of mockTxDataWithPassthrough[5]
// https://rest.kingbch.com/v5/rawtransactions/getRawTransaction/5e0436c6741e226d05c5b7e7e23de8213d3583e2669e50a80b908bf4cb471317?verbose=true
export const mockReceivedXecTxRawTx = {
    txid: '5e0436c6741e226d05c5b7e7e23de8213d3583e2669e50a80b908bf4cb471317',
    hash: '5e0436c6741e226d05c5b7e7e23de8213d3583e2669e50a80b908bf4cb471317',
    version: 2,
    size: 226,
    locktime: 0,
    vin: [
        {
            txid: '51801bc6b5b73b5248b2ebdda93931e66097782ede9ed39f6ac3ead9372f2be9',
            vout: 1,
            scriptSig: {
                asm: '3045022100bfd53134ddee18ab3eab614de1bcdebc77febd41db666e293ad6bebc28a27ce30220085a61da18d19e5b67950f00fba21ef083fc1d37fe1082b619ab8badc54a84fb[ALL|FORKID] 0352cbc218d193ceaf4fb38a772856380173db7a908905e3190841b3174c7ae22d',
                hex: '483045022100bfd53134ddee18ab3eab614de1bcdebc77febd41db666e293ad6bebc28a27ce30220085a61da18d19e5b67950f00fba21ef083fc1d37fe1082b619ab8badc54a84fb41210352cbc218d193ceaf4fb38a772856380173db7a908905e3190841b3174c7ae22d',
            },
            sequence: 4294967295,
        },
    ],
    vout: [
        {
            value: 1,
            n: 0,
            scriptPubKey: {
                asm: 'OP_DUP OP_HASH160 76458db0ed96fe9863fc1ccec9fa2cfab884b0f6 OP_EQUALVERIFY OP_CHECKSIG',
                hex: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                reqSigs: 1,
                type: 'pubkeyhash',
                addresses: [
                    'bitcoincash:qpmytrdsakt0axrrlswvaj069nat3p9s7ct4lsf8k9',
                ],
            },
        },
        {
            value: 9.99996993,
            n: 1,
            scriptPubKey: {
                asm: 'OP_DUP OP_HASH160 6e1da64f04fc29dbe0b8d33a341e05e3afc586eb OP_EQUALVERIFY OP_CHECKSIG',
                hex: '76a9146e1da64f04fc29dbe0b8d33a341e05e3afc586eb88ac',
                reqSigs: 1,
                type: 'pubkeyhash',
                addresses: [
                    'bitcoincash:qphpmfj0qn7znklqhrfn5dq7qh36l3vxavu346vqcl',
                ],
            },
        },
    ],
    hex: '0200000001e92b2f37d9eac36a9fd39ede2e789760e63139a9ddebb248523bb7b5c61b8051010000006b483045022100bfd53134ddee18ab3eab614de1bcdebc77febd41db666e293ad6bebc28a27ce30220085a61da18d19e5b67950f00fba21ef083fc1d37fe1082b619ab8badc54a84fb41210352cbc218d193ceaf4fb38a772856380173db7a908905e3190841b3174c7ae22dffffffff0200e1f505000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac41be9a3b000000001976a9146e1da64f04fc29dbe0b8d33a341e05e3afc586eb88ac00000000',
    blockhash:
        '000000000000000043f496ae1b8a443d71b6661f123cfb4b83ca9b9b3371aa71',
    confirmations: 77273,
    time: 1612454937,
    blocktime: 1612454937,
};

// API result for getRawTransaction for the first vin txid of mockTxDataWithPassthrough[13]
// https://rest.kingbch.com/v5/rawtransactions/getRawTransaction/eab9f9128986f1832522449e708172d387cdfe6b9bbd5e8f46f6e15ffe612a68?verbose=true
export const mockBurnEtokenTxRawTx = {
    txid: 'eab9f9128986f1832522449e708172d387cdfe6b9bbd5e8f46f6e15ffe612a68',
    hash: 'eab9f9128986f1832522449e708172d387cdfe6b9bbd5e8f46f6e15ffe612a68',
    version: 2,
    size: 437,
    locktime: 0,
    vin: [
        {
            txid: '14bd615173d161a45c2fe99dcebf91f20bae2e348affef71af182a8fb9b4d223',
            vout: 2,
            scriptSig: {
                asm: '3045022100d4b080923e3b820f2d674a73160bcb990dca7277b8f479bce29372450d5cad1b02203f2b2f9da0e821c082e7f2617c3f29e929b59747a4c456e337608400a3200422[ALL|FORKID] 02394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e',
                hex: '483045022100d4b080923e3b820f2d674a73160bcb990dca7277b8f479bce29372450d5cad1b02203f2b2f9da0e821c082e7f2617c3f29e929b59747a4c456e337608400a3200422412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e',
            },
            sequence: 4294967295,
        },
        {
            txid: '14bd615173d161a45c2fe99dcebf91f20bae2e348affef71af182a8fb9b4d223',
            vout: 1,
            scriptSig: {
                asm: '304402205eb42f45129b6934e400e2ad594b8d15304fd72177103a18cbd6aaeef05afab602206e974dc078ff7166b27d7631cbfd76bd3633145ea74d27cfe85d0a13c9e454aa[ALL|FORKID] 02394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e',
                hex: '47304402205eb42f45129b6934e400e2ad594b8d15304fd72177103a18cbd6aaeef05afab602206e974dc078ff7166b27d7631cbfd76bd3633145ea74d27cfe85d0a13c9e454aa412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e',
            },
            sequence: 4294967295,
        },
    ],
    vout: [
        {
            value: 0,
            n: 0,
            scriptPubKey: {
                asm: 'OP_RETURN 5262419 1 1145980243 75bec4bf1607301cc4c052abab25a03da387725cdf3e16c7922a2cefa01f9a2d 0000000000000000',
                hex: '6a04534c500001010453454e442075bec4bf1607301cc4c052abab25a03da387725cdf3e16c7922a2cefa01f9a2d080000000000000000',
                type: 'nulldata',
            },
        },
        {
            value: 0.00000546,
            n: 1,
            scriptPubKey: {
                asm: 'OP_DUP OP_HASH160 0b7d35fda03544a08e65464d54cfae4257eb6db7 OP_EQUALVERIFY OP_CHECKSIG',
                hex: '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                reqSigs: 1,
                type: 'pubkeyhash',
                addresses: [
                    'bitcoincash:qq9h6d0a5q65fgywv4ry64x04ep906mdku7ymranw3',
                ],
            },
        },
        {
            value: 0.00004546,
            n: 2,
            scriptPubKey: {
                asm: 'OP_DUP OP_HASH160 0b7d35fda03544a08e65464d54cfae4257eb6db7 OP_EQUALVERIFY OP_CHECKSIG',
                hex: '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                reqSigs: 1,
                type: 'pubkeyhash',
                addresses: [
                    'bitcoincash:qq9h6d0a5q65fgywv4ry64x04ep906mdku7ymranw3',
                ],
            },
        },
    ],
    hex: '020000000223d2b4b98f2a18af71efff8a342eae0bf291bfce9de92f5ca461d1735161bd14020000006b483045022100d4b080923e3b820f2d674a73160bcb990dca7277b8f479bce29372450d5cad1b02203f2b2f9da0e821c082e7f2617c3f29e929b59747a4c456e337608400a3200422412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3effffffff23d2b4b98f2a18af71efff8a342eae0bf291bfce9de92f5ca461d1735161bd14010000006a47304402205eb42f45129b6934e400e2ad594b8d15304fd72177103a18cbd6aaeef05afab602206e974dc078ff7166b27d7631cbfd76bd3633145ea74d27cfe85d0a13c9e454aa412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3effffffff030000000000000000376a04534c500001010453454e442075bec4bf1607301cc4c052abab25a03da387725cdf3e16c7922a2cefa01f9a2d08000000000000000022020000000000001976a9140b7d35fda03544a08e65464d54cfae4257eb6db788acc2110000000000001976a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac00000000',
    blockhash:
        '0000000000000000085cb4b2529b7c931ead4c3ad7043d786a3e1a14574a9002',
    confirmations: 25111,
    time: 1643286228,
    blocktime: 1643286228,
};

// API result for getRawTransaction for the first vin txid of mockTxDataWithPassthrough[3]
// https://rest.kingbch.com/v5/rawtransactions/getRawTransaction/50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e?verbose=true
export const mockReceivedEtokenTxRawTx = {
    txid: '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
    hash: '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
    version: 2,
    size: 336,
    locktime: 0,
    vin: [
        {
            txid: 'be38b0488679e25823b7a72b925ac695a7b486e7f78122994b913f3079b0b939',
            vout: 2,
            scriptSig: {
                asm: '3045022100e28006843eb071ec6d8dd105284f2ca625a28f4dc85418910b59a5ab13fc6c2002205921fb12b541d1cd1a63e7e012aca5735df3398525f64bac04337d2102941361[ALL|FORKID] 034509251caa5f01e2787c436949eb94d71dcc451bcde5791ae5b7109255f5f0a3',
                hex: '483045022100e28006843eb071ec6d8dd105284f2ca625a28f4dc85418910b59a5ab13fc6c2002205921fb12b541d1cd1a63e7e012aca5735df3398525f64bac04337d21029413614121034509251caa5f01e2787c436949eb94d71dcc451bcde5791ae5b7109255f5f0a3',
            },
            sequence: 4294967295,
        },
    ],
    vout: [
        {
            value: 0,
            n: 0,
            scriptPubKey: {
                asm: 'OP_RETURN 5262419 1 47454e45534953 4407892 74616263617368 68747470733a2f2f636173687461626170702e636f6d2f 0 0 2 0000000000000064',
                hex: '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001000102080000000000000064',
                type: 'nulldata',
            },
        },
        {
            value: 0.00000546,
            n: 1,
            scriptPubKey: {
                asm: 'OP_DUP OP_HASH160 b8d9512d2adf8b4e70c45c26b6b00d75c28eaa96 OP_EQUALVERIFY OP_CHECKSIG',
                hex: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                reqSigs: 1,
                type: 'pubkeyhash',
                addresses: [
                    'bitcoincash:qzudj5fd9t0cknnsc3wzdd4sp46u9r42jcnqnwfss0',
                ],
            },
        },
        {
            value: 0.00000546,
            n: 2,
            scriptPubKey: {
                asm: 'OP_DUP OP_HASH160 b8d9512d2adf8b4e70c45c26b6b00d75c28eaa96 OP_EQUALVERIFY OP_CHECKSIG',
                hex: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                reqSigs: 1,
                type: 'pubkeyhash',
                addresses: [
                    'bitcoincash:qzudj5fd9t0cknnsc3wzdd4sp46u9r42jcnqnwfss0',
                ],
            },
        },
        {
            value: 0.00089406,
            n: 3,
            scriptPubKey: {
                asm: 'OP_DUP OP_HASH160 b8d9512d2adf8b4e70c45c26b6b00d75c28eaa96 OP_EQUALVERIFY OP_CHECKSIG',
                hex: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                reqSigs: 1,
                type: 'pubkeyhash',
                addresses: [
                    'bitcoincash:qzudj5fd9t0cknnsc3wzdd4sp46u9r42jcnqnwfss0',
                ],
            },
        },
    ],
    hex: '020000000139b9b079303f914b992281f7e786b4a795c65a922ba7b72358e2798648b038be020000006b483045022100e28006843eb071ec6d8dd105284f2ca625a28f4dc85418910b59a5ab13fc6c2002205921fb12b541d1cd1a63e7e012aca5735df3398525f64bac04337d21029413614121034509251caa5f01e2787c436949eb94d71dcc451bcde5791ae5b7109255f5f0a3ffffffff040000000000000000436a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c000100010208000000000000006422020000000000001976a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac22020000000000001976a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac3e5d0100000000001976a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac00000000',
    blockhash:
        '000000000000000034c77993a35c74fe2dddace27198681ca1e89e928d0c2fff',
    confirmations: 75010,
    time: 1613859311,
    blocktime: 1613859311,
};
