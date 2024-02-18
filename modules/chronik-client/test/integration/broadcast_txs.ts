// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { ChronikClientNode } from '../../index';
import initializeTestRunner from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Test broadcastTx and broadcastTxs methods from ChronikClientNode', () => {
    let testRunner: ChildProcess;
    let chronik_url: Promise<Array<string>>;
    let get_alp_genesis_rawtx: Promise<string>;
    let get_alp_genesis_txid: Promise<string>;
    let get_ok_rawtx: Promise<string>;
    let get_ok_txid: Promise<string>;
    let get_alp_burn_rawtx: Promise<string>;
    let get_alp_burn_txid: Promise<string>;
    let get_alp_burn_2_rawtx: Promise<string>;
    let get_alp_burn_2_txid: Promise<string>;
    const statusEvent = new EventEmitter();

    before(async () => {
        testRunner = initializeTestRunner('chronik-client_broadcast_txs');

        testRunner.on('message', function (message: any) {
            if (message && message.chronik) {
                console.log('Setting chronik url to ', message.chronik);
                chronik_url = new Promise(resolve => {
                    resolve([message.chronik]);
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

            if (message && message.status) {
                statusEvent.emit(message.status);
            }
        });
    });

    after(() => {
        testRunner.send('stop');
    });

    beforeEach(async () => {
        await once(statusEvent, 'ready');
    });

    afterEach(() => {
        testRunner.send('next');
    });

    it('New regtest chain', async () => {
        // Initialize new ChronikClientNode
        const chronik = new ChronikClientNode(await chronik_url);

        // We can't broadcast an invalid tx
        const BAD_RAW_TX =
            '0100000001fa5b8f14f5b63ae42f7624a416214bdfffd1de438e9db843a4ddf4d392302e2100000000020151000000000800000000000000003c6a5039534c5032000747454e4553495300000000000006e80300000000d00700000000b80b00000000a00f0000000088130000000070170000000000102700000000000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87102700000000000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87102700000000000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87102700000000000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87102700000000000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87102700000000000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b8760c937278c04000017a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b8700000000';
        await expect(chronik.broadcastTx(BAD_RAW_TX)).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-tx (): 400: Broadcast failed: Transaction rejected by mempool: bad-txns-in-belowout, value in (25000000.00) < value out (49999999600.00)`,
        );

        // We can broadcast an ALP genesis tx
        const alpGenesisRawTx = await get_alp_genesis_rawtx;
        const alpGenesisTxid = await get_alp_genesis_txid;

        expect(await chronik.broadcastTx(alpGenesisRawTx)).to.deep.equal({
            txid: alpGenesisTxid,
        });

        // We can't broadcast an ALP burn tx without setting skipTokenChecks
        const alpBurnRawTx = await get_alp_burn_rawtx;
        const alpBurnTxid = await get_alp_burn_txid;

        await expect(chronik.broadcastTx(alpBurnRawTx)).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-tx (): 400: Tx ${alpBurnTxid} failed token checks: Unexpected burn: Burns 1 base tokens.`,
        );

        // We also can't broadcast an array of txs if one tx is a burn
        const okRawTx = await get_ok_rawtx;
        const okTxid = await get_ok_txid;

        await expect(
            chronik.broadcastTxs([okRawTx, alpBurnRawTx]),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-txs (): 400: Tx ${alpBurnTxid} failed token checks: Unexpected burn: Burns 1 base tokens.`,
        );

        // We can't broadcast an array of txs if one tx is invalid
        // Note that BAD_RAW_TX is now bad because of mempool conflict with genesis tx, this error takes precedence
        // over bad-txns-in-belowout
        await expect(
            chronik.broadcastTxs([okRawTx, BAD_RAW_TX]),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-txs (): 400: Broadcast failed: Transaction rejected by mempool: txn-mempool-conflict`,
        );

        // We can broadcast multiple txs including a burn if we set skipTokenChecks
        expect(
            await chronik.broadcastTxs([okRawTx, alpBurnRawTx], true),
        ).to.deep.equal({ txids: [okTxid, alpBurnTxid] });

        // We can broadcast an ALP burn tx if we set skipTokenChecks
        const alpBurnTwoRawTx = await get_alp_burn_2_rawtx;
        const alpBurnTwoTxid = await get_alp_burn_2_txid;
        expect(await chronik.broadcastTx(alpBurnTwoRawTx, true)).to.deep.equal({
            txid: alpBurnTwoTxid,
        });

        // All of these txs are in the mempool, i.e. they have been broadcast
        const broadcastTxids = [
            alpGenesisTxid,
            okTxid,
            alpBurnTxid,
            alpBurnTwoTxid,
        ];
        for (const txid of broadcastTxids) {
            expect((await chronik.tx(txid)).txid).to.eql(txid);
        }

        // We can't broadcast an invalid rawtx
        await expect(chronik.broadcastTx('not a rawtx')).to.be.rejectedWith(
            Error,
            `Odd hex length: not a rawtx`,
        );

        // We can't broadcast a rawtx that conflicts with the mempool
        await expect(chronik.broadcastTx(BAD_RAW_TX)).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-tx (): 400: Broadcast failed: Transaction rejected by mempool: txn-mempool-conflict`,
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
            `Failed getting /broadcast-tx (): 400: Failed indexing mempool token tx: Tx is spending 1a3fa6b5a219a75bc287c382280ae36f3ff118757330f5670d463e10ec949154 which is found neither in the mempool nor DB`,
        );
    });
    it('After broadcastTxs are mined', async () => {
        // Initialize new ChronikClientNode
        const chronik = new ChronikClientNode(await chronik_url);

        const alpGenesisRawTx = await get_alp_genesis_rawtx;
        // If we broadcast a tx already in the mempool, we get a normal response

        await expect(chronik.broadcastTx(alpGenesisRawTx)).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-tx (): 400: Broadcast failed: Transaction already in block chain`,
        );
    });
});
