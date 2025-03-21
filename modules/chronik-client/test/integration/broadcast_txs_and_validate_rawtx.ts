// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import path from 'path';
import { ChronikClient, Tx } from '../../index';
import { fromHex } from '../../src/hex';
import initializeTestRunner, {
    cleanupMochaRegtest,
    setMochaTimeout,
    TestInfo,
} from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Test broadcastTx and broadcastTxs methods from ChronikClient', () => {
    // Define variables used in scope of this test
    const testName = path.basename(__filename);
    let testRunner: ChildProcess;
    let get_alp_genesis_rawtx: Promise<string>;
    let get_alp_genesis_txid: Promise<string>;
    let get_ok_rawtx: Promise<string>;
    let get_ok_txid: Promise<string>;
    let get_alp_burn_rawtx: Promise<string>;
    let get_alp_burn_txid: Promise<string>;
    let get_alp_burn_2_rawtx: Promise<string>;
    let get_alp_burn_2_txid: Promise<string>;
    const statusEvent = new EventEmitter();
    let get_test_info: Promise<TestInfo>;
    let chronikUrl: string[];
    let setupScriptTermination: ReturnType<typeof setTimeout>;
    let alpGenesisRawTx: string;
    let alpGenesisPreview: Tx;
    let alpGenesisAfter: Tx;

    before(async function () {
        // Initialize testRunner before mocha tests
        testRunner = initializeTestRunner(testName, statusEvent);

        // Handle IPC messages from the setup script
        testRunner.on('message', function (message: any) {
            if (message && message.test_info) {
                get_test_info = new Promise(resolve => {
                    resolve(message.test_info);
                });
            }

            if (message && message.alp_genesis_rawtx) {
                get_alp_genesis_rawtx = new Promise(resolve => {
                    resolve(message.alp_genesis_rawtx);
                });
            }

            if (message && message.alp_genesis_txid) {
                get_alp_genesis_txid = new Promise(resolve => {
                    resolve(message.alp_genesis_txid);
                });
            }

            if (message && message.ok_rawtx) {
                get_ok_rawtx = new Promise(resolve => {
                    resolve(message.ok_rawtx);
                });
            }

            if (message && message.ok_txid) {
                get_ok_txid = new Promise(resolve => {
                    resolve(message.ok_txid);
                });
            }

            if (message && message.alp_burn_rawtx) {
                get_alp_burn_rawtx = new Promise(resolve => {
                    resolve(message.alp_burn_rawtx);
                });
            }

            if (message && message.alp_burn_txid) {
                get_alp_burn_txid = new Promise(resolve => {
                    resolve(message.alp_burn_txid);
                });
            }

            if (message && message.alp_burn_2_rawtx) {
                get_alp_burn_2_rawtx = new Promise(resolve => {
                    resolve(message.alp_burn_2_rawtx);
                });
            }

            if (message && message.alp_burn_2_txid) {
                get_alp_burn_2_txid = new Promise(resolve => {
                    resolve(message.alp_burn_2_txid);
                });
            }
        });

        await once(statusEvent, 'ready');

        const testInfo = await get_test_info;

        chronikUrl = [testInfo.chronik];
        console.log(`chronikUrl set to ${JSON.stringify(chronikUrl)}`);

        setupScriptTermination = setMochaTimeout(
            this,
            testName,
            testInfo,
            testRunner,
        );

        testRunner.send('next');
    });

    after(async () => {
        await cleanupMochaRegtest(
            testName,
            testRunner,
            setupScriptTermination,
            statusEvent,
        );
    });

    beforeEach(async () => {
        await once(statusEvent, 'ready');
    });

    afterEach(() => {
        testRunner.send('next');
    });

    it('New regtest chain. Behavior of broadcastTx and validateRawTx.', async () => {
        // Initialize new ChronikClientNode
        const chronik = new ChronikClient(chronikUrl);

        // validateTx input validation
        await expect(
            chronik.validateRawTx({
                rawTx: 'not a string or a Uint8Array',
            } as unknown as Uint8Array),
        ).to.be.rejectedWith(
            Error,
            'rawTx must be a hex string or a Uint8Array',
        );

        // We can't broadcast an invalid tx
        const BAD_VALUE_IN_SATS = 2500000000;
        const BAD_VALUE_OUT_SATS = 4999999960000;
        const SATOSHIS_PER_XEC = 100;
        const BAD_RAW_TX =
            '0100000001fa5b8f14f5b63ae42f7624a416214bdfffd1de438e9db843a4ddf4d392302e2100000000020151000000000800000000000000003c6a5039534c5032000747454e4553495300000000000006e80300000000d00700000000b80b00000000a00f0000000088130000000070170000000000102700000000000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87102700000000000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87102700000000000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87102700000000000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87102700000000000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87102700000000000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b8760c937278c04000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b8700000000';
        await expect(chronik.broadcastTx(BAD_RAW_TX)).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-tx: 400: Broadcast failed: Transaction rejected by mempool: bad-txns-in-belowout, value in (${(
                BAD_VALUE_IN_SATS / SATOSHIS_PER_XEC
            ).toFixed(2)}) < value out (${(
                BAD_VALUE_OUT_SATS / SATOSHIS_PER_XEC
            ).toFixed(2)})`,
        );

        // We can, though, preview an invalid tx using chronik.validateRawTx
        const invalidTx = await chronik.validateRawTx(BAD_RAW_TX);
        expect(invalidTx.txid).to.eql(
            '5c91ef5b654d21ad5db2c7af71f2924a0c31a5ef347498bbcba8ee1374d6c6a9',
        );
        // We can also call validateTx with rawTx as a Uint8Array
        const sameInvalidTx = await chronik.validateRawTx(fromHex(BAD_RAW_TX));
        expect(sameInvalidTx.txid).to.eql(invalidTx.txid);
        const invalidTxSumInputs = invalidTx.inputs
            .map(input => input.sats)
            .reduce((prev, curr) => prev + curr, 0n);
        const invalidTxSumOutputs = invalidTx.outputs
            .map(output => output.sats)
            .reduce((prev, curr) => prev + curr, 0n);

        // Indeed, the outputs are greater than the inputs, and such that the tx is invalid
        expect(invalidTxSumInputs).to.eql(BigInt(BAD_VALUE_IN_SATS));
        expect(invalidTxSumOutputs).to.eql(BigInt(BAD_VALUE_OUT_SATS));

        // We cannot call validateRawTx to get a tx from a rawtx of a normal token send tx if its inputs are not in the mempool or db
        // txid in blockchain but not regtest, 423e24bf0715cfb80727e5e7a6ff7b9e37cb2f555c537ab06fdc7fd9b3a0ba3a
        const NORMAL_TOKEN_SEND =
            '020000000278e5886fb86174d9abd4af331a4b67a3baf37d052703c176009a92dba60181d9020000006b4830450221009149768d5e8b2bedf8259f91741db160ae389451ed11bb376f372c61c88d58ec02202492c21df1b21b99d7b021eb6eef78be99b45a64e9c7d9ce8f8880abfa28a5e4412103632f603f43ae61afece65288d7d92e55188783edb74e205be974b8cd1cd36a1effffffff78e5886fb86174d9abd4af331a4b67a3baf37d052703c176009a92dba60181d9030000006b483045022100f7311d000d3fbe672dd742e85f372cd6d52435210d0c92f21e73ca6588918a4702204b5a7a90a73e5fd48f90af24c02c4f15e8c40515af931dd44f8030691a2e5d8d412103632f603f43ae61afece65288d7d92e55188783edb74e205be974b8cd1cd36a1effffffff040000000000000000406a04534c500001010453454e4420fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa0800000002540be40008000000079d6e2ee722020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88acf7190600000000001976a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac00000000';

        await expect(
            chronik.validateRawTx(NORMAL_TOKEN_SEND),
        ).to.be.rejectedWith(
            Error,
            'Failed getting /validate-tx: 400: Failed indexing mempool token tx: Tx is spending d98101a6db929a0076c10327057df3baa3674b1a33afd4abd97461b86f88e578 which is found neither in the mempool nor DB',
        );

        alpGenesisRawTx = await get_alp_genesis_rawtx;
        const alpGenesisTxid = await get_alp_genesis_txid;

        // We can validateRawTx an ALP genesis tx before it is broadcast
        alpGenesisPreview = await chronik.validateRawTx(alpGenesisRawTx);

        // We can broadcast an ALP genesis tx
        expect(await chronik.broadcastTx(alpGenesisRawTx)).to.deep.equal({
            txid: alpGenesisTxid,
        });

        const alpBurnRawTx = await get_alp_burn_rawtx;
        const alpBurnTxid = await get_alp_burn_txid;

        // We can preview an ALP burn tx before it is broadcast
        const alpBurnPreview = await chronik.validateRawTx(alpBurnRawTx);

        // We can't broadcast an ALP burn tx without setting skipTokenChecks
        await expect(chronik.broadcastTx(alpBurnRawTx)).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-tx: 400: Tx ${alpBurnTxid} failed token checks: Unexpected burn: Burns 1 atoms.`,
        );

        // We also can't broadcast an array of txs if one tx is a burn
        const okRawTx = await get_ok_rawtx;
        const okTxid = await get_ok_txid;

        await expect(
            chronik.broadcastTxs([okRawTx, alpBurnRawTx]),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-txs: 400: Tx ${alpBurnTxid} failed token checks: Unexpected burn: Burns 1 atoms.`,
        );

        // We can't broadcast an array of txs if one tx is invalid
        // Note that BAD_RAW_TX is now bad because of mempool conflict with genesis tx, this error takes precedence
        // over bad-txns-in-belowout
        await expect(
            chronik.broadcastTxs([okRawTx, BAD_RAW_TX]),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-txs: 400: Broadcast failed: Transaction rejected by mempool: txn-mempool-conflict`,
        );

        // We can also preview okRawTx before it is broadcast
        const okPreview = await chronik.validateRawTx(okRawTx);

        // We can broadcast multiple txs including a burn if we set skipTokenChecks
        expect(
            await chronik.broadcastTxs([okRawTx, alpBurnRawTx], true),
        ).to.deep.equal({ txids: [okTxid, alpBurnTxid] });

        // We can broadcast an ALP burn tx if we set skipTokenChecks
        const alpBurnTwoRawTx = await get_alp_burn_2_rawtx;
        const alpBurnTwoTxid = await get_alp_burn_2_txid;

        // And we can preview it before it is broadcast
        const alpBurnTwoPreview = await chronik.validateRawTx(alpBurnTwoRawTx);

        expect(await chronik.broadcastTx(alpBurnTwoRawTx, true)).to.deep.equal({
            txid: alpBurnTwoTxid,
        });

        // All of these txs are in the mempool, i.e. they have been broadcast
        const broadcastTxs = [
            { txid: alpGenesisTxid, preview: alpGenesisPreview },
            { txid: okTxid, preview: okPreview },
            { txid: alpBurnTxid, preview: alpBurnPreview },
            { txid: alpBurnTwoTxid, preview: alpBurnTwoPreview },
        ];
        for (const tx of broadcastTxs) {
            const { txid, preview } = tx;
            const txInMempool = await chronik.tx(txid);
            // We get the same tx from the mempool
            expect(txInMempool.txid).to.eql(txid);
            // Previewing the tx gives us the same info as calling chronik.tx on the tx in the mempool
            // Except for expected changes
            // - spentBy key is present in mempool if it was spentBy
            // - timeFirstSeen is 0 in the preview txs
            expect({ ...preview }).to.deep.equal({
                ...txInMempool,
                // preview txs have timeFirstSeen of 0
                timeFirstSeen: 0,
                // preview txs have output.spentBy undefined
                outputs: [...preview.outputs],
            });
        }

        // If we use validateRawTx on a tx that has been broadcast, we still get timeFirstSeen of 0
        // and outputs.spentBy of undefined, even if the outputs have been spent
        // We can validateRawTx an ALP genesis tx after it is broadcast
        alpGenesisAfter = await chronik.validateRawTx(alpGenesisRawTx);
        expect(alpGenesisAfter).to.deep.equal(alpGenesisPreview);

        // We can't broadcast an invalid hex rawtx
        await expect(chronik.broadcastTx('not a rawtx')).to.be.rejectedWith(
            Error,
            `Odd hex length: not a rawtx`,
        );

        // We can't preview an invalid hex rawtx
        await expect(chronik.validateRawTx('not a rawtx')).to.be.rejectedWith(
            Error,
            `Odd hex length: not a rawtx`,
        );

        // We can't broadcast a rawtx that conflicts with the mempool
        await expect(chronik.broadcastTx(BAD_RAW_TX)).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-tx: 400: Broadcast failed: Transaction rejected by mempool: txn-mempool-conflict`,
        );

        // If we broadcast a tx already in the mempool, we get a normal response
        expect(await chronik.broadcastTx(alpGenesisRawTx)).to.deep.equal({
            txid: alpGenesisTxid,
        });

        // We can't broadcast a tx if its inputs do not exist in mempool or blockchain
        // 16fb49b12c7bcafd997040be7ceb9eb72d8624285aae5b13bd3d86e21dea4a93, just taken from mainnet
        // We do not have mainnet history in regtest, so invalid
        const INPUTS_DO_NOT_EXIST_RAWTX =
            '0200000002549194ec103e460d67f530737518f13f6fe30a2882c387c25ba719a2b5a63f1a020000006a47304402204b14aba87bab02e88a19f0303c7d3a6d86583abd99ff1bab2ee185b6499d26c202205e893212af1f5b9a63ab3c0eb6b9432c8d483fbc163fd86ffa7e8711d50eed4a4121037b40772a921c6add3c283037a8784c68378883dcb05b85c1eddfce9b55783027ffffffff42f3c77adfe2d84c2230b8cebc358819538d19075adaa35f09402254d92d7801030000006b483045022100f1fdd68b241be27066b0e0fa673a075e1630677c70c31af62848c658da452a0402205c0274b0ac8a481d03cb75fea6563752dff3bd7f897a5f8278b4a4ee6527a4744121037b40772a921c6add3c283037a8784c68378883dcb05b85c1eddfce9b55783027ffffffff040000000000000000406a04534c500001010453454e4420fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa080000000005f5e1000800000008bb2c970022020000000000001976a91404577f22113160825ce6a2d3ad6696527ee9bdf288ac22020000000000001976a91479557c1fec4f44c688b993feed5cd7a8900d5d6188ac60880d00000000001976a91479557c1fec4f44c688b993feed5cd7a8900d5d6188ac00000000';

        await expect(
            chronik.broadcastTx(INPUTS_DO_NOT_EXIST_RAWTX),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-tx: 400: Failed indexing mempool token tx: Tx is spending 1a3fa6b5a219a75bc287c382280ae36f3ff118757330f5670d463e10ec949154 which is found neither in the mempool nor DB`,
        );
    });
    it('After broadcastTxs are mined', async () => {
        const chronik = new ChronikClient(chronikUrl);

        const alpGenesisRawTx = await get_alp_genesis_rawtx;

        // We can't broadcast a rawtx if it is already in a block
        await expect(chronik.broadcastTx(alpGenesisRawTx)).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-tx: 400: Broadcast failed: Transaction already in block chain`,
        );

        // If we use validateRawTx on a tx that has been mined, we still get timeFirstSeen of 0
        // and outputs.spentBy of undefined, even if the outputs have been spent
        const alpGenesisAfterMined = await chronik.validateRawTx(
            alpGenesisRawTx,
        );

        expect(alpGenesisPreview).to.deep.equal({
            ...alpGenesisAfterMined,
            inputs: [
                {
                    ...alpGenesisAfterMined.inputs[0],
                    outputScript: alpGenesisPreview.inputs[0].outputScript,
                    sats: alpGenesisPreview.inputs[0].sats,
                },
            ],
        });
    });
});
