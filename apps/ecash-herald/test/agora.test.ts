// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import assert from 'assert';
import { parseAgoraTx } from '../src/agora';
import { parseTx, getBlockTgMessage, parseBlockTxs } from '../src/parse';
import { GenesisInfo, Tx } from 'chronik-client';

const agoraTokenInfoMap = new Map<string, GenesisInfo>([
    [
        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
        {
            tokenName: 'Firma',
            tokenTicker: 'FIRMA',
            decimals: 4,
            url: 'https://firma.cash',
            data: '',
            authPubkey: '',
        },
    ],
    [
        'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
        {
            tokenName: 'Staked XEC',
            tokenTicker: 'XECX',
            decimals: 2,
            url: 'https://stakedxec.com',
            data: '',
            authPubkey: '',
        },
    ],
]);

// Chronik tx: 1f5ba3cd328443e202a063b775a162408bf1ed2ddfdf0b94b59f2094ace33686 (FIRMA relist)
const firmaRelistTx: Tx = {
    txid: '1f5ba3cd328443e202a063b775a162408bf1ed2ddfdf0b94b59f2094ace33686',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: '3c98cac85e36e7f2503f0e06f27f52ea2bdee8b3eeacac4ecea71f8b2a0b8a22',
                outIdx: 1,
            },
            inputScript:
                '4135ccd4f6aa008740663483c3f9fc4ae87fb306db253f1419f237633b86ffbd53ceff652dab40d0c735202bacea01ee67232512c3520aa54a2f1504e1ae5e345f41004d5f014c78534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487036a504b41475230075041525449414c000030e28e7915000000922ee20200000000c05ad07b63080000ae1f042503fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105080030bcfcffffff7fab7b63817b6ea2697606c05ad07b6308a269760530e28e79159700887d945279012a7f757892635357807e780530e28e7915965667525768807e52790530e28e79159656807e827c7e5379012a7f777c7e825980bc7c7e007e7b04912ee2029304922ee2029658807e041976a914707501577f77a97e0288ac7e7e6b7d02220258800317a9147e024c7872587d807e7e7e01ab7e537901257f7702db007f5c7f7701207f547f7504ae1f0425886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501577f7768ac',
            sats: 546n,
            sequenceNo: 4294967295,
            token: {
                tokenId:
                    '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                atoms: 100000000n,
                isMintBaton: false,
                entryIdx: 0,
            },
            plugins: {
                agora: {
                    groups: [
                        '5003fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
                        '540387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        '460387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    ],
                    data: [
                        '5041525449414c',
                        '00',
                        '00',
                        '30e28e7915000000',
                        '922ee20200000000',
                        'c05ad07b63080000',
                        'ae1f0425',
                    ],
                },
            },
            outputScript: 'a9140b3008d34c2a5021beca5cee0b71dccf37f4bf8e87',
        },
        {
            prevOut: {
                txid: '88d60c5cb1364924e64e716a7fb8f8924719a12c9597cdb7f0565ea37b95c90a',
                outIdx: 2,
            },
            inputScript:
                '41017ae267039d7cd35c141310b53add30194def94dd2d83594575253903af8899906b384f01220ac779d36d8f5df33da2c3c6678b4e5b35770354e71b435167b4412103fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
            sats: 3241859n,
            sequenceNo: 4294967295,
            outputScript: '76a914cf76d8e334b149cb49ad1f95de339c3e6e9ed54188ac',
        },
    ],
    outputs: [
        {
            sats: 0n,
            outputScript:
                '6a504b41475230075041525449414c000030e28e7915000000cb8fe30200000000c05ad07b630800001e91b74703fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d10531534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487030100e1f5050000',
        },
        {
            sats: 546n,
            outputScript: 'a9144333923a1eed7b5bf01244569f9f043e10d3f41887',
            plugins: {
                agora: {
                    groups: [
                        '5003fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
                        '540387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        '460387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    ],
                    data: [
                        '5041525449414c',
                        '00',
                        '00',
                        '30e28e7915000000',
                        'cb8fe30200000000',
                        'c05ad07b63080000',
                        '1e91b747',
                    ],
                },
            },
            token: {
                tokenId:
                    '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                atoms: 100000000n,
                isMintBaton: false,
                entryIdx: 0,
            },
        },
        {
            sats: 3241041n,
            outputScript: '76a914cf76d8e334b149cb49ad1f95de339c3e6e9ed54188ac',
        },
    ],
    lockTime: 0,
    timeFirstSeen: 1781800802,
    size: 818,
    isCoinbase: false,
    tokenEntries: [
        {
            tokenId:
                '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
            tokenType: {
                protocol: 'ALP',
                type: 'ALP_TOKEN_TYPE_STANDARD',
                number: 0,
            },
            txType: 'SEND',
            isInvalid: false,
            burnSummary: '',
            failedColorings: [],
            actualBurnAtoms: 0n,
            intentionalBurnAtoms: 0n,
            burnsMintBatons: false,
        },
    ],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NORMAL',
    isFinal: true,
    block: {
        height: 954058,
        hash: '000000000000000033477a11797468dd6637f4ad435deaa316373798892c28ff',
        timestamp: 1781800965,
    },
};

// Chronik tx: ac4b2a6340cb18cdfd963d15a464f33e2e5cd6150315f6fc114e7d308cc9db5d (XECX partial sale)
const xecxPartialSaleTx: Tx = {
    txid: 'ac4b2a6340cb18cdfd963d15a464f33e2e5cd6150315f6fc114e7d308cc9db5d',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: 'a91e2c479adfe898c5c69bc4627c8c3fbfba2b631521459beb4fac85972849c5',
                outIdx: 2,
            },
            inputScript:
                '21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b140d0d8119b92dffce5f2dc83d41c84e8cf2556a8e72dee12b10264bc7034fefd6aeeb75f6d0ff370f8b3d7cd77ca4e3e62352e7e164e1853b9af05c6c52bcf2b734422020000000000001976a9145791235820282ee685fa2cf83e7075d80b45cfd888acf3943c00000000001976a9145791235820282ee685fa2cf83e7075d80b45cfd888ac4d2b01c549289785ac4feb9b452115632bbabf3f8c7c62c49bc6c598e8df9a472c1ea902000000d27b63817b6ea26976053829c7f301a269760373f17f9700887d945279012a7f757892635357807e780373f17f965667525768807e52790373f17f9656807e827c7e5379012a7f777c7e825980bc7c7e007e7b0372f17f930373f17f9658807e041976a914707501577f77a97e0288ac7e7e6b7d02220258800317a9147e024c7872587d807e7e7e01ab7e537901257f7702d2007f5c7f7701207f547f750409d80848886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501577f7768ac2202000000000000ffffffff67cbc6ee0150e2cc28b9dbacad9599706c4f5b623026d6d8f25e6a791c00018409d80848c100000007069c891ff8b60b514d56014c78534c5032000453454e44d44ecf795494b063aa10be876868880df8ef822577c1a546fb1cd9b6c2f57bc66a504b41475230075041525449414c000073f17f000000000073f17f00000000003829c7f30100000009d8084803e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f650086c0c3150d8d1264aab7b63817b6ea26976053829c7f301a269760373f17f9700887d945279012a7f757892635357807e780373f17f965667525768807e52790373f17f9656807e827c7e5379012a7f777c7e825980bc7c7e007e7b0372f17f930373f17f9658807e041976a914707501577f77a97e0288ac7e7e6b7d02220258800317a9147e024c7872587d807e7e7e01ab7e537901257f7702d2007f5c7f7701207f547f750409d80848886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501577f7768ac',
            sats: 546n,
            sequenceNo: 4294967295,
            token: {
                tokenId:
                    'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                atoms: 637240702692n,
                isMintBaton: false,
                entryIdx: 0,
            },
            plugins: {
                agora: {
                    groups: [
                        '5003e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f650',
                        '54c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                        '46c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                    ],
                    data: [
                        '5041525449414c',
                        '00',
                        '00',
                        '73f17f0000000000',
                        '73f17f0000000000',
                        '3829c7f301000000',
                        '09d80848',
                    ],
                },
            },
            outputScript: 'a9140b77e8c5d4b52974ed7ee809da035734b66696a387',
        },
        {
            prevOut: {
                txid: 'c9b9dfd98ab7f944413b75032f8f36d98a01c94fc028010d9062a98640074e66',
                outIdx: 4,
            },
            inputScript:
                '416cff1447808907d4d579416400332365986f0a06bd749e24fbe3f2feb31b77da8de8e2abada54d9020791005d6a3aee69efad29a8182e8981773bebbc499bcce41210265a62aca8cefc71580a1b822d092828689c3c3bc61b7677eb87f9ffaa0677ace',
            sats: 5107407n,
            sequenceNo: 4294967295,
            outputScript: '76a9145791235820282ee685fa2cf83e7075d80b45cfd888ac',
        },
        {
            prevOut: {
                txid: 'd342b9b636deb581fa15c1d271a471fb41da5b494a7b395faf6e2d20deac44b7',
                outIdx: 0,
            },
            inputScript:
                '41b1c332b9b760bb6bc220727fdc075103f632e281c2a8ab7c38039941fb6cb57dfd1576e45ffe16d966ca18caaefac22ab06eb001eef554204ea3bda1f16bb6af41210265a62aca8cefc71580a1b822d092828689c3c3bc61b7677eb87f9ffaa0677ace',
            sats: 392120394n,
            sequenceNo: 4294967295,
            outputScript: '76a9145791235820282ee685fa2cf83e7075d80b45cfd888ac',
        },
    ],
    outputs: [
        {
            sats: 0n,
            outputScript:
                '6a504b41475230075041525449414c000073f17f000000000073f17f00000000003829c7f30100000009d8084803e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f6503d534c5032000453454e44d44ecf795494b063aa10be876868880df8ef822577c1a546fb1cd9b6c2f57bc60300000000000082dc10479400629a70170000',
        },
        {
            sats: 393255522n,
            outputScript: '76a9149b487946ba24c1d61248ba992e3d533105cea14b88ac',
        },
        {
            sats: 546n,
            outputScript: 'a914ac69d7c1b0ffb58526b138bc1838b14effbf69ea87',
            plugins: {
                agora: {
                    groups: [
                        '5003e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f650',
                        '54c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                        '46c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                    ],
                    data: [
                        '5041525449414c',
                        '00',
                        '00',
                        '73f17f0000000000',
                        '73f17f0000000000',
                        '3829c7f301000000',
                        '09d80848',
                    ],
                },
            },
            token: {
                tokenId:
                    'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                atoms: 636847447170n,
                isMintBaton: false,
                entryIdx: 0,
            },
            spentBy: {
                txid: '5f4a1d9f7e8db1b98f26fa99eb3c201510dbb91d323b1e3f13b135eb9461172d',
                outIdx: 0,
            },
        },
        {
            sats: 546n,
            outputScript: '76a9145791235820282ee685fa2cf83e7075d80b45cfd888ac',
            token: {
                tokenId:
                    'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                atoms: 393255522n,
                isMintBaton: false,
                entryIdx: 0,
            },
        },
        {
            sats: 3970291n,
            outputScript: '76a9145791235820282ee685fa2cf83e7075d80b45cfd888ac',
        },
    ],
    lockTime: 1208539145,
    timeFirstSeen: 1781800412,
    size: 1442,
    isCoinbase: false,
    tokenEntries: [
        {
            tokenId:
                'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
            tokenType: {
                protocol: 'ALP',
                type: 'ALP_TOKEN_TYPE_STANDARD',
                number: 0,
            },
            txType: 'SEND',
            isInvalid: false,
            burnSummary: '',
            failedColorings: [],
            actualBurnAtoms: 0n,
            intentionalBurnAtoms: 0n,
            burnsMintBatons: false,
        },
    ],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NORMAL',
    isFinal: true,
    block: {
        height: 954057,
        hash: '00000000000000009d14ecac7816ccfbdefb52876d00f9843c9ce20106e05100',
        timestamp: 1781800677,
    },
};

const mockCoinbaseTx: Tx = {
    txid: '0000000000000000000000000000000000000000000000000000000000000001',
    version: 1,
    inputs: [
        {
            prevOut: {
                txid: '0000000000000000000000000000000000000000000000000000000000000000',
                outIdx: 4294967295,
            },
            inputScript:
                '0392800c04904c5d650cfabe6d6d2a5055cb96fc034feb64a6533f9ba428768f019b0efc92797bb1eeae3bda05e410000000000000000800002bed8efca61700000015643839366564326466356633353334353432323837',
            sequenceNo: 0,
            sats: 0n,
        },
    ],
    outputs: [
        {
            sats: 362500000n,
            outputScript: '76a914ce8c8cf69a922a607e8e03e27ec014fbc24882e088ac',
        },
    ],
    lockTime: 0,
    timeFirstSeen: 0,
    size: 100,
    isCoinbase: true,
    tokenEntries: [],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    isFinal: true,
    block: {
        height: 954058,
        hash: '000000000000000033477a11797468dd6637f4ad435deaa316373798892c28ff',
        timestamp: 1781800965,
    },
};

describe('agora tx parsing', function () {
    it('parseAgoraTx identifies a FIRMA relist tx', function () {
        const parsed = parseAgoraTx(firmaRelistTx);
        assert.deepEqual(parsed, {
            txid: firmaRelistTx.txid,
            action: 'RELIST',
            tokenId:
                '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
            atoms: 100000000n,
            price: 190298510609n,
        });
    });

    it('parseAgoraTx identifies an XECX partial sale tx', function () {
        const parsed = parseAgoraTx(xecxPartialSaleTx);
        assert.deepEqual(parsed, {
            txid: xecxPartialSaleTx.txid,
            action: 'BUY',
            tokenId:
                'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
            atoms: 393255522n,
            price: 393255522n,
        });
    });

    it('parseTx classifies agora txs without tokenSendInfo', function () {
        const firmaParsed = parseTx(firmaRelistTx);
        assert.equal(firmaParsed.tokenSendInfo, false);
        assert.deepEqual(firmaParsed.agoraInfo, {
            txid: firmaRelistTx.txid,
            action: 'RELIST',
            tokenId:
                '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
            atoms: 100000000n,
            price: 190298510609n,
        });

        const xecxParsed = parseTx(xecxPartialSaleTx);
        assert.equal(xecxParsed.tokenSendInfo, false);
        assert.deepEqual(xecxParsed.agoraInfo, {
            txid: xecxPartialSaleTx.txid,
            action: 'BUY',
            tokenId:
                'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
            atoms: 393255522n,
            price: 393255522n,
        });
    });

    it('getBlockTgMessage reports agora activity instead of token sends', function () {
        const parsedBlock = parseBlockTxs(
            '000000000000000033477a11797468dd6637f4ad435deaa316373798892c28ff',
            954058,
            [mockCoinbaseTx, firmaRelistTx, xecxPartialSaleTx],
        );

        const tgMsgs = getBlockTgMessage(
            parsedBlock,
            [],
            agoraTokenInfoMap,
            false,
        );
        const msg = tgMsgs.join('\n');

        assert.match(msg, /🏛🪙 Agora/);
        assert.match(msg, /🏷1 tx relisted 10,000\.0000/);
        assert.match(msg, /Firma \(FIRMA\)/);
        assert.match(msg, /💰1 tx sold 3,932,555\.22/);
        assert.match(msg, /Staked XEC \(XECX\)/);
        assert.doesNotMatch(msg, / sent /);
    });
});
