// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import cashaddr from 'ecashaddrjs';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { ChronikClientNode, ScriptType_InNode } from '../../index';
import initializeTestRunner from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Get script().history and script().utxos()', () => {
    let testRunner: ChildProcess;
    let chronik_url: Promise<Array<string>>;
    let get_txs_broadcast: Promise<string>;

    let get_p2pkh_address: Promise<string>;
    let get_p2pkh_txids: Promise<Array<string>>;

    let get_p2sh_address: Promise<string>;
    let get_p2sh_txids: Promise<Array<string>>;

    let get_p2pk_script: Promise<string>;
    let get_p2pk_txids: Promise<Array<string>>;

    let get_other_script: Promise<string>;
    let get_other_txids: Promise<Array<string>>;

    let get_mixed_output_txid: Promise<string>;
    const statusEvent = new EventEmitter();

    before(async () => {
        testRunner = initializeTestRunner(
            'chronik-client_script_utxos_and_history',
        );

        testRunner.on('message', function (message: any) {
            if (message && message.chronik) {
                console.log('Setting chronik url to ', message.chronik);
                chronik_url = new Promise(resolve => {
                    resolve([message.chronik]);
                });
            }

            if (message && message.txs_broadcast) {
                get_txs_broadcast = new Promise(resolve => {
                    resolve(message.txs_broadcast);
                });
            }

            if (message && message.p2pkh_address) {
                get_p2pkh_address = new Promise(resolve => {
                    resolve(message.p2pkh_address);
                });
            }

            if (message && message.p2sh_address) {
                get_p2sh_address = new Promise(resolve => {
                    resolve(message.p2sh_address);
                });
            }

            if (message && message.p2pk_script) {
                get_p2pk_script = new Promise(resolve => {
                    resolve(message.p2pk_script);
                });
            }

            if (message && message.other_script) {
                get_other_script = new Promise(resolve => {
                    resolve(message.other_script);
                });
            }

            if (message && message.p2pk_txids) {
                get_p2pk_txids = new Promise(resolve => {
                    resolve(message.p2pk_txids);
                });
            }

            if (message && message.p2pkh_txids) {
                get_p2pkh_txids = new Promise(resolve => {
                    resolve(message.p2pkh_txids);
                });
            }

            if (message && message.p2sh_txids) {
                get_p2sh_txids = new Promise(resolve => {
                    resolve(message.p2sh_txids);
                });
            }

            if (message && message.other_txids) {
                get_other_txids = new Promise(resolve => {
                    resolve(message.other_txids);
                });
            }

            if (message && message.mixed_output_txid) {
                get_mixed_output_txid = new Promise(resolve => {
                    resolve(message.mixed_output_txid);
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

    const REGTEST_CHAIN_INIT_HEIGHT = 200;

    // Will get these values from node ipc, then use in multiple steps
    let chronikUrl = [''];
    let txsBroadcast = 0;

    let p2pkhAddress = '';
    let p2pkhAddressHash = '';
    let p2pkhTxids: string[] = [];

    let p2shAddress = '';
    let p2shAddressHash = '';
    let p2shTxids: string[] = [];

    let p2pkScript = '';
    let p2pkScriptBytecountHex = '00';
    let p2pkTxids: string[] = [];

    let otherScript = '';
    let otherTxids: string[] = [];

    it('New regtest chain', async () => {
        // Get chronik URL (used in all tests)
        chronikUrl = await chronik_url;
        const chronik = new ChronikClientNode(chronikUrl);

        // Get addresses / scripts (used in all tests)
        p2pkhAddress = await get_p2pkh_address;
        p2shAddress = await get_p2sh_address;
        p2pkScript = await get_p2pk_script;
        otherScript = await get_other_script;

        // Get hashes for addresses (used in all tests)
        const decodedP2pkh = cashaddr.decode(p2pkhAddress, true);
        if (typeof decodedP2pkh.hash === 'string') {
            p2pkhAddressHash = decodedP2pkh.hash;
        }
        const decodedP2sh = cashaddr.decode(p2shAddress, true);
        if (typeof decodedP2sh.hash === 'string') {
            p2shAddressHash = decodedP2sh.hash;
        }

        const checkEmptyHistoryAndUtxos = async (
            chronik: ChronikClientNode,
            type: ScriptType_InNode,
            payload: string,
            expectedOutputScript: string,
        ) => {
            const chronikScript = chronik.script(type, payload);
            const history = await chronikScript.history();
            const utxos = await chronikScript.utxos();

            // Expect empty history
            expect(history).to.deep.equal({ txs: [], numPages: 0, numTxs: 0 });

            // Hash is returned at the outputScript key, no utxos
            expect(utxos).to.deep.equal({
                outputScript: expectedOutputScript,
                utxos: [],
            });

            console.log('\x1b[32m%s\x1b[0m', `✔ ${type}`);
        };

        // p2pkh
        await checkEmptyHistoryAndUtxos(
            chronik,
            'p2pkh',
            p2pkhAddressHash,
            cashaddr.getOutputScriptFromAddress(p2pkhAddress),
        );

        // p2sh
        await checkEmptyHistoryAndUtxos(
            chronik,
            'p2sh',
            p2shAddressHash,
            cashaddr.getOutputScriptFromAddress(p2shAddress),
        );

        // p2pk
        p2pkScriptBytecountHex = (p2pkScript.length / 2).toString(16);
        await checkEmptyHistoryAndUtxos(
            chronik,
            'p2pk',
            p2pkScript,
            `${p2pkScriptBytecountHex}${p2pkScript}ac`,
        );

        // other
        await checkEmptyHistoryAndUtxos(
            chronik,
            'other',
            otherScript,
            otherScript,
        );

        // Expected errors
        const checkExpectedErrors = async (
            chronik: ChronikClientNode,
            type: ScriptType_InNode,
        ) => {
            const nonHexPayload = 'justsomestring';
            const chronikScriptNonHexPayload = chronik.script(
                type,
                nonHexPayload,
            );
            await expect(
                chronikScriptNonHexPayload.history(),
            ).to.be.rejectedWith(
                Error,
                `Failed getting /script/${type}/${nonHexPayload}/history?page=0&page_size=25 (): 400: Invalid hex: Invalid character '${nonHexPayload[0]}' at position 0`,
            );
            await expect(chronikScriptNonHexPayload.utxos()).to.be.rejectedWith(
                Error,
                `Failed getting /script/${type}/${nonHexPayload}/utxos (): 400: Invalid hex: Invalid character '${nonHexPayload[0]}' at position 0`,
            );

            const hexPayload = 'deadbeef';
            const chronikScriptHexPayload = chronik.script(type, hexPayload);

            if (type === 'p2pkh' || type == 'p2sh') {
                await expect(
                    chronikScriptHexPayload.history(),
                ).to.be.rejectedWith(
                    Error,
                    `Failed getting /script/${type}/${hexPayload}/history?page=0&page_size=25 (): 400: Invalid payload for ${type.toUpperCase()}: Invalid length, expected 20 bytes but got 4 bytes`,
                );
                await expect(
                    chronikScriptHexPayload.utxos(),
                ).to.be.rejectedWith(
                    Error,
                    `Failed getting /script/${type}/${hexPayload}/utxos (): 400: Invalid payload for ${type.toUpperCase()}: Invalid length, expected 20 bytes but got 4 bytes`,
                );
            }
            if (type === 'p2pk') {
                await expect(
                    chronikScriptHexPayload.history(),
                ).to.be.rejectedWith(
                    Error,
                    `Failed getting /script/${type}/${hexPayload}/history?page=0&page_size=25 (): 400: Invalid payload for ${type.toUpperCase()}: Invalid length, expected one of [33, 65] but got 4 bytes`,
                );
                await expect(
                    chronikScriptHexPayload.utxos(),
                ).to.be.rejectedWith(
                    Error,
                    `Failed getting /script/${type}/${hexPayload}/utxos (): 400: Invalid payload for ${type.toUpperCase()}: Invalid length, expected one of [33, 65] but got 4 bytes`,
                );
            }

            console.log(
                '\x1b[32m%s\x1b[0m',
                `✔ ${type} throws expected errors`,
            );
        };
        await checkExpectedErrors(chronik, 'p2pkh');
        await checkExpectedErrors(chronik, 'p2sh');
        await checkExpectedErrors(chronik, 'p2pk');
        await checkExpectedErrors(chronik, 'other');

        // 'other' endpoint will not throw an error on ridiculously long valid hex
        // 440 bytes
        const outTherePayload =
            'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
        await checkEmptyHistoryAndUtxos(
            chronik,
            'other',
            outTherePayload,
            outTherePayload,
        );
    });

    it('After some txs have been broadcast', async () => {
        txsBroadcast = parseInt(await get_txs_broadcast);

        const chronik = new ChronikClientNode(chronikUrl);

        const checkHistoryAndUtxosInMempool = async (
            chronik: ChronikClientNode,
            type: ScriptType_InNode,
            payload: string,
            expectedOutputScript: string,
            broadcastTxids: string[],
        ) => {
            const chronikScript = chronik.script(type, payload);
            // Use broadcastTxids.length for page size, so that we can be sure the first page has all the txs
            // Test pagination separately
            const history = await chronikScript.history(
                0,
                broadcastTxids.length,
            );
            const utxos = await chronikScript.utxos();

            // fetched history tx count is the same as txids broadcast to this address
            expect(history.numTxs).to.eql(broadcastTxids.length);

            const historyTxids = [];
            for (const fetchedHistoryTx of history.txs) {
                historyTxids.push(fetchedHistoryTx.txid);
                // The 'block' key is undefined, denoting an unconfirmed tx
                expect(typeof fetchedHistoryTx.block).to.eql('undefined');
            }

            // txids fetched from history match what the node broadcast
            expect(historyTxids).to.have.members(broadcastTxids);

            // The returned outputScript matches the calling script hash
            expect(utxos.outputScript).to.eql(expectedOutputScript);

            // We have as many utxos as there were txs sent to this address
            expect(utxos.utxos.length).to.eql(broadcastTxids.length);

            const utxoTxids = [];
            for (const utxo of utxos.utxos) {
                // Each utxo is unconfirmed, denoted by a value of -1 at the blockHeight key
                expect(utxo.blockHeight).to.eql(-1);
                // The utxo is not from a finalized tx
                expect(utxo.isFinal).to.eql(false);
                utxoTxids.push(utxo.outpoint.txid);
            }

            // utxos fetched from history match what the node broadcast
            expect(utxoTxids).to.have.members(broadcastTxids);

            console.log('\x1b[32m%s\x1b[0m', `✔ ${type}`);
        };

        // p2pkh
        p2pkhTxids = await get_p2pkh_txids;
        await checkHistoryAndUtxosInMempool(
            chronik,
            'p2pkh',
            p2pkhAddressHash,
            cashaddr.getOutputScriptFromAddress(p2pkhAddress),
            p2pkhTxids,
        );

        // p2sh
        p2shTxids = await get_p2sh_txids;
        await checkHistoryAndUtxosInMempool(
            chronik,
            'p2sh',
            p2shAddressHash,
            cashaddr.getOutputScriptFromAddress(p2shAddress),
            p2shTxids,
        );

        // p2pk
        p2pkTxids = await get_p2pk_txids;
        await checkHistoryAndUtxosInMempool(
            chronik,
            'p2pk',
            p2pkScript,
            `${p2pkScriptBytecountHex}${p2pkScript}ac`,
            p2pkTxids,
        );

        // other
        otherTxids = await get_other_txids;
        await checkHistoryAndUtxosInMempool(
            chronik,
            'other',
            otherScript,
            otherScript,
            otherTxids,
        );

        const checkPagination = async (
            chronik: ChronikClientNode,
            type: ScriptType_InNode,
            payload: string,
            txsBroadcast: number,
            customPageSize: number,
        ) => {
            const chronikScript = chronik.script(type, payload);
            // We can customize pageSize for history
            const customPageSizeHistory = await chronikScript.history(
                0,
                customPageSize,
            );

            if (customPageSize <= txsBroadcast) {
                expect(customPageSizeHistory.txs.length).to.eql(customPageSize);
            } else {
                expect(customPageSizeHistory.txs.length).to.eql(txsBroadcast);
            }

            // We expect enough pages for the full history
            expect(customPageSizeHistory.numPages).to.eql(
                Math.ceil(txsBroadcast / customPageSize),
            );
            // Note, the first page is page 0
            // The last page is numPages - 1
            const lastPage = customPageSizeHistory.numPages - 1;
            const lastPageHistoryCustomPageSize = await chronik
                .script(type, payload)
                .history(lastPage, customPageSize);
            const expectedEntriesOnLastPage =
                txsBroadcast % customPageSize === 0
                    ? customPageSize
                    : txsBroadcast % customPageSize;
            expect(lastPageHistoryCustomPageSize.txs.length).to.eql(
                expectedEntriesOnLastPage,
            );

            // If we ask for a page number higher than numPages, we get an empty array of txs
            const emptyPage = await chronik
                .script(type, payload)
                .history(lastPage + 1, customPageSize);
            expect(emptyPage.txs.length).to.eql(0);

            // We cannot use pageSize of 0
            await expect(chronikScript.history(0, 0)).to.be.rejectedWith(
                Error,
                `Failed getting /script/${type}/${payload}/history?page=0&page_size=0 (): 400: Requested page size 0 is too small, minimum is 1`,
            );

            console.log('\x1b[32m%s\x1b[0m', `✔ ${type} pagination`);
        };

        // p2pkh pagination
        await checkPagination(
            chronik,
            'p2pkh',
            p2pkhAddressHash,
            txsBroadcast,
            3,
        );
        // p2sh pagination
        await checkPagination(
            chronik,
            'p2sh',
            p2shAddressHash,
            txsBroadcast,
            1,
        );
        // p2pk pagination
        await checkPagination(chronik, 'p2pk', p2pkScript, txsBroadcast, 20);
        // other pagination
        await checkPagination(chronik, 'other', otherScript, txsBroadcast, 50);
    });
    it('After these txs are mined', async () => {
        const chronik = new ChronikClientNode(chronikUrl);

        const checkHistoryAndUtxosAfterConfirmation = async (
            chronik: ChronikClientNode,
            type: ScriptType_InNode,
            payload: string,
            expectedOutputScript: string,
            broadcastTxids: string[],
        ) => {
            const chronikScript = chronik.script(type, payload);
            // Use broadcastTxids.length for page size, so that we can be sure the first page has all the txs
            // Test pagination separately
            const history = await chronikScript.history(
                0,
                broadcastTxids.length,
            );
            const utxos = await chronikScript.utxos();

            // fetched history tx count is the same as txids broadcast to this address
            expect(history.numTxs).to.eql(broadcastTxids.length);

            const historyTxids = [];
            for (const fetchedHistoryTx of history.txs) {
                historyTxids.push(fetchedHistoryTx.txid);
                // We now have a blockheight
                expect(fetchedHistoryTx.block?.height).to.eql(
                    REGTEST_CHAIN_INIT_HEIGHT + 1,
                );
            }

            // txids fetched from history match what the node broadcast
            expect(historyTxids).to.have.members(broadcastTxids);

            // The returned outputScript matches the calling script hash
            expect(utxos.outputScript).to.eql(expectedOutputScript);

            // We have as many utxos as there were txs sent to this address
            expect(utxos.utxos.length).to.eql(broadcastTxids.length);

            const utxoTxids = [];
            for (const utxo of utxos.utxos) {
                // Each utxo is now confirmed at the right blockheight
                expect(utxo.blockHeight).to.eql(REGTEST_CHAIN_INIT_HEIGHT + 1);
                // The utxo is not from a finalized tx
                expect(utxo.isFinal).to.eql(false);
                utxoTxids.push(utxo.outpoint.txid);
            }

            // utxos fetched from history match what the node broadcast
            expect(utxoTxids).to.have.members(broadcastTxids);

            console.log('\x1b[32m%s\x1b[0m', `✔ ${type}`);
        };
        // p2pkh
        await checkHistoryAndUtxosAfterConfirmation(
            chronik,
            'p2pkh',
            p2pkhAddressHash,
            cashaddr.getOutputScriptFromAddress(p2pkhAddress),
            p2pkhTxids,
        );

        // p2sh
        await checkHistoryAndUtxosAfterConfirmation(
            chronik,
            'p2sh',
            p2shAddressHash,
            cashaddr.getOutputScriptFromAddress(p2shAddress),
            p2shTxids,
        );

        // p2pk
        await checkHistoryAndUtxosAfterConfirmation(
            chronik,
            'p2pk',
            p2pkScript,
            `${p2pkScriptBytecountHex}${p2pkScript}ac`,
            p2pkTxids,
        );

        // other
        await checkHistoryAndUtxosAfterConfirmation(
            chronik,
            'other',
            otherScript,
            otherScript,
            otherTxids,
        );
    });
    it('After these txs are avalanche finalized', async () => {
        // Note: no change is expected from script().history() for this case
        // as 'isFinal' is present only on utxos
        // Potential TODO, add isFinal key to tx proto in chronik

        const chronik = new ChronikClientNode(chronikUrl);

        const checkAvalancheFinalized = async (
            chronik: ChronikClientNode,
            type: ScriptType_InNode,
            payload: string,
            expectedOutputScript: string,
            broadcastTxids: string[],
        ) => {
            const chronikScript = chronik.script(type, payload);
            const utxos = await chronikScript.utxos();

            // The returned outputScript matches the calling script hash
            expect(utxos.outputScript).to.eql(expectedOutputScript);

            // We have as many utxos as there were txs sent to this address
            expect(utxos.utxos.length).to.eql(broadcastTxids.length);

            const utxoTxids = [];
            for (const utxo of utxos.utxos) {
                // Each utxo is now confirmed at the right blockheight
                expect(utxo.blockHeight).to.eql(REGTEST_CHAIN_INIT_HEIGHT + 1);
                // The utxo is now marked as finalized by Avalanche
                expect(utxo.isFinal).to.eql(true);
                utxoTxids.push(utxo.outpoint.txid);
            }

            // utxos fetched from history match what the node broadcast
            expect(utxoTxids).to.have.members(broadcastTxids);

            console.log('\x1b[32m%s\x1b[0m', `✔ ${type}`);
        };

        // p2pkh
        await checkAvalancheFinalized(
            chronik,
            'p2pkh',
            p2pkhAddressHash,
            cashaddr.getOutputScriptFromAddress(p2pkhAddress),
            p2pkhTxids,
        );

        // p2sh
        await checkAvalancheFinalized(
            chronik,
            'p2sh',
            p2shAddressHash,
            cashaddr.getOutputScriptFromAddress(p2shAddress),
            p2shTxids,
        );

        // p2pk
        await checkAvalancheFinalized(
            chronik,
            'p2pk',
            p2pkScript,
            `${p2pkScriptBytecountHex}${p2pkScript}ac`,
            p2pkTxids,
        );

        // other
        await checkAvalancheFinalized(
            chronik,
            'other',
            otherScript,
            otherScript,
            otherTxids,
        );
    });
    it('After a tx is broadcast with outputs of each type', async () => {
        const chronik = new ChronikClientNode(chronikUrl);
        const mixedTxid = await get_mixed_output_txid;

        const checkMixedTxInHistory = async (
            chronik: ChronikClientNode,
            type: ScriptType_InNode,
            payload: string,
            mixedTxid: string,
            txsBroadcast: number,
        ) => {
            const chronikScript = chronik.script(type, payload);
            const history = await chronikScript.history();
            const utxos = await chronikScript.utxos();
            // We see a new tx in numTxs count
            expect(history.numTxs).to.eql(txsBroadcast + 1);
            // The most recent txid appears at the first element of the tx history array
            expect(history.txs[0].txid).to.eql(mixedTxid);
            // The most recent txid appears at the last element of the utxos array
            expect(utxos.utxos[utxos.utxos.length - 1].outpoint.txid).to.eql(
                mixedTxid,
            );
            console.log(
                `${type} script endpoints registed tx with mixed outputs`,
            );
        };

        await checkMixedTxInHistory(
            chronik,
            'p2pkh',
            p2pkhAddressHash,
            mixedTxid,
            txsBroadcast,
        );

        await checkMixedTxInHistory(
            chronik,
            'p2sh',
            p2shAddressHash,
            mixedTxid,
            txsBroadcast,
        );

        await checkMixedTxInHistory(
            chronik,
            'p2pk',
            p2pkScript,
            mixedTxid,
            txsBroadcast,
        );

        await checkMixedTxInHistory(
            chronik,
            'other',
            otherScript,
            mixedTxid,
            txsBroadcast,
        );
    });
});
