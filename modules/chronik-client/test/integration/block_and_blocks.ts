// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import path from 'path';
import { ChronikClientNode } from '../../index';
import initializeTestRunner, {
    cleanupMochaRegtest,
    setMochaTimeout,
    TestInfo,
} from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('/block and /blocks', () => {
    // Define variables used in scope of this test
    const testName = path.basename(__filename);
    let testRunner: ChildProcess;
    const statusEvent = new EventEmitter();
    let get_test_info: Promise<TestInfo>;
    let chronikUrl: string[];
    let setupScriptTermination: ReturnType<typeof setTimeout>;

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

            if (message && message.status) {
                statusEvent.emit(message.status);
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

    const REGTEST_CHAIN_INIT_HEIGHT = 200;

    it('gives us the block and blocks', async () => {
        const chronik = new ChronikClientNode(chronikUrl);
        const blockFromHeight = await chronik.block(REGTEST_CHAIN_INIT_HEIGHT);
        expect(blockFromHeight.blockInfo.height).to.eql(
            REGTEST_CHAIN_INIT_HEIGHT,
        );

        // Get the same block by calling hash instead of height
        const blockFromHash = await chronik.block(
            blockFromHeight.blockInfo.hash,
        );

        // Verify it is the same
        expect(blockFromHash).to.deep.equal(blockFromHeight);

        // Gives us blocks
        const lastThreeBlocks = await chronik.blocks(
            REGTEST_CHAIN_INIT_HEIGHT - 2,
            REGTEST_CHAIN_INIT_HEIGHT,
        );

        const lastThreeBlocksLength = lastThreeBlocks.length;
        expect(lastThreeBlocksLength).to.eql(3);
        // Expect the last block to equal the most recent one called with block
        expect(blockFromHash.blockInfo).to.deep.equal(lastThreeBlocks[2]);

        // Expect lastThreeBlocks to be in order
        for (let i = 0; i < lastThreeBlocksLength - 1; i += 1) {
            const thisBlock = lastThreeBlocks[i];
            const { hash, height } = thisBlock;
            const nextBlock = lastThreeBlocks[i + 1];
            expect(hash).to.eql(nextBlock.prevHash);
            expect(height).to.eql(nextBlock.height - 1);
        }

        // Throws expected error if we call blocks with startHeight > endHeight
        await expect(
            chronik.blocks(
                REGTEST_CHAIN_INIT_HEIGHT,
                REGTEST_CHAIN_INIT_HEIGHT - 2,
            ),
        ).to.be.rejectedWith(
            Error,
            'Failed getting /blocks/200/198 (): 400: Invalid block end height: 198',
        );
    });
    it('gives us the block at 10 higher', async () => {
        const chronik = new ChronikClientNode(chronikUrl);
        const blockFromHeight = await chronik.block(
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );
        expect(blockFromHeight.blockInfo.height).to.eql(
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );

        // Get the same block by calling hash instead of height
        const blockFromHash = await chronik.block(
            blockFromHeight.blockInfo.hash,
        );

        // Verify it is the same
        expect(blockFromHash).to.deep.equal(blockFromHeight);

        // Gives us blocks
        const lastThreeBlocks = await chronik.blocks(
            REGTEST_CHAIN_INIT_HEIGHT + 10 - 2,
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );

        const lastThreeBlocksLength = lastThreeBlocks.length;
        expect(lastThreeBlocksLength).to.eql(3);
        // Expect the last block to equal the most recent one called with block
        expect(blockFromHash.blockInfo).to.deep.equal(lastThreeBlocks[2]);

        // Expect lastThreeBlocks to be in order
        for (let i = 0; i < lastThreeBlocksLength - 1; i += 1) {
            const thisBlock = lastThreeBlocks[i];
            const { hash, height } = thisBlock;
            const nextBlock = lastThreeBlocks[i + 1];
            expect(hash).to.eql(nextBlock.prevHash);
            expect(height).to.eql(nextBlock.height - 1);
        }
    });
    it('gives us the block after parking the last block and throws expected error attempting to get parked block', async () => {
        const chronik = new ChronikClientNode(chronikUrl);
        const blockFromHeight = await chronik.block(
            REGTEST_CHAIN_INIT_HEIGHT + 9,
        );
        expect(blockFromHeight.blockInfo.height).to.eql(
            REGTEST_CHAIN_INIT_HEIGHT + 9,
        );

        // Get the same block by calling hash instead of height
        const blockFromHash = await chronik.block(
            blockFromHeight.blockInfo.hash,
        );

        // Verify it is the same
        expect(blockFromHash).to.deep.equal(blockFromHeight);

        // Throws expected error if asked to fetch the parked block
        await expect(
            chronik.block(REGTEST_CHAIN_INIT_HEIGHT + 10),
        ).to.be.rejectedWith(
            Error,
            'Failed getting /block/210 (): 404: Block not found: 210',
        );

        // blocks does not throw error if asked for parked block, but also does not return it
        const latestBlocksAvailable = await chronik.blocks(
            REGTEST_CHAIN_INIT_HEIGHT + 8,
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );

        // We only get REGTEST_CHAIN_INIT_HEIGHT + 8 and REGTEST_CHAIN_INIT_HEIGHT + 9,
        // despite asking for REGTEST_CHAIN_INIT_HEIGHT + 10,
        const latestBlocksAvailableLength = latestBlocksAvailable.length;
        expect(latestBlocksAvailableLength).to.equal(2);

        // Expect latestBlocksAvailable to be in order
        for (let i = 0; i < latestBlocksAvailableLength - 1; i += 1) {
            const thisBlock = latestBlocksAvailable[i];
            const { hash, height } = thisBlock;
            const nextBlock = latestBlocksAvailable[i + 1];
            expect(hash).to.eql(nextBlock.prevHash);
            expect(height).to.eql(nextBlock.height - 1);
        }

        // We get an empty array if we ask for an unavailable block
        const latestBlockAvailableByBlocks = await chronik.blocks(
            REGTEST_CHAIN_INIT_HEIGHT + 10,
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );
        expect(latestBlockAvailableByBlocks).to.deep.equal([]);
    });
    it('gives us the block and blocks after unparking the last block', async () => {
        const chronik = new ChronikClientNode(chronikUrl);
        const blockFromHeight = await chronik.block(
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );
        expect(blockFromHeight.blockInfo.height).to.eql(
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );

        // Get the same block by calling hash instead of height
        const blockFromHash = await chronik.block(
            blockFromHeight.blockInfo.hash,
        );

        // Verify it is the same
        expect(blockFromHash).to.deep.equal(blockFromHeight);

        // Blocks gets the unparked block now
        const latestBlocksAvailable = await chronik.blocks(
            REGTEST_CHAIN_INIT_HEIGHT + 8,
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );

        // Now we get all 3 blocks
        const latestBlocksAvailableLength = latestBlocksAvailable.length;
        expect(latestBlocksAvailableLength).to.equal(3);

        // Expect latestBlocksAvailable to be in order
        for (let i = 0; i < latestBlocksAvailableLength - 1; i += 1) {
            const thisBlock = latestBlocksAvailable[i];
            const { hash, height } = thisBlock;
            const nextBlock = latestBlocksAvailable[i + 1];
            expect(hash).to.eql(nextBlock.prevHash);
            expect(height).to.eql(nextBlock.height - 1);
        }

        // We get the now-unparked block
        const latestBlockAvailableByBlocks = await chronik.blocks(
            REGTEST_CHAIN_INIT_HEIGHT + 10,
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );

        // We get it in an array of length 1
        expect([blockFromHash.blockInfo]).to.deep.equal(
            latestBlockAvailableByBlocks,
        );
    });
    it('gives us the block and blocks after invalidating the last block and throws expected error attempting to get invalidated block', async () => {
        const chronik = new ChronikClientNode(chronikUrl);
        const blockFromHeight = await chronik.block(
            REGTEST_CHAIN_INIT_HEIGHT + 9,
        );
        expect(blockFromHeight.blockInfo.height).to.eql(
            REGTEST_CHAIN_INIT_HEIGHT + 9,
        );

        // Get the same block by calling hash instead of height
        const blockFromHash = await chronik.block(
            blockFromHeight.blockInfo.hash,
        );

        // Verify it is the same
        expect(blockFromHash).to.deep.equal(blockFromHeight);

        // Throws expected error if asked to fetch the parked block
        await expect(
            chronik.block(REGTEST_CHAIN_INIT_HEIGHT + 10),
        ).to.be.rejectedWith(
            Error,
            'Failed getting /block/210 (): 404: Block not found: 210',
        );

        // blocks does not throw error if asked for invalidated block, but also does not return it
        const latestBlocksAvailable = await chronik.blocks(
            REGTEST_CHAIN_INIT_HEIGHT + 8,
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );

        // We only get REGTEST_CHAIN_INIT_HEIGHT + 8 and REGTEST_CHAIN_INIT_HEIGHT + 9,
        // despite asking for REGTEST_CHAIN_INIT_HEIGHT + 10,
        const latestBlocksAvailableLength = latestBlocksAvailable.length;
        expect(latestBlocksAvailableLength).to.equal(2);

        // Expect latestBlocksAvailable to be in order
        for (let i = 0; i < latestBlocksAvailableLength - 1; i += 1) {
            const thisBlock = latestBlocksAvailable[i];
            const { hash, height } = thisBlock;
            const nextBlock = latestBlocksAvailable[i + 1];
            expect(hash).to.eql(nextBlock.prevHash);
            expect(height).to.eql(nextBlock.height - 1);
        }

        // We get an empty array if we ask for an unavailable (invalidated) block
        const latestBlockAvailableByBlocks = await chronik.blocks(
            REGTEST_CHAIN_INIT_HEIGHT + 10,
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );
        expect(latestBlockAvailableByBlocks).to.deep.equal([]);
    });
    it('gives us the block and blocks after reconsiderblock called on the last block', async () => {
        const chronik = new ChronikClientNode(chronikUrl);
        const blockFromHeight = await chronik.block(
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );
        expect(blockFromHeight.blockInfo.height).to.eql(
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );

        // Get the same block by calling hash instead of height
        const blockFromHash = await chronik.block(
            blockFromHeight.blockInfo.hash,
        );

        // Verify it is the same
        expect(blockFromHash).to.deep.equal(blockFromHeight);

        // Blocks gets the reconsidered block now
        const latestBlocksAvailable = await chronik.blocks(
            REGTEST_CHAIN_INIT_HEIGHT + 8,
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );

        // Now we get all 3 blocks
        const latestBlocksAvailableLength = latestBlocksAvailable.length;
        expect(latestBlocksAvailableLength).to.equal(3);

        // Expect latestBlocksAvailable to be in order
        for (let i = 0; i < latestBlocksAvailableLength - 1; i += 1) {
            const thisBlock = latestBlocksAvailable[i];
            const { hash, height } = thisBlock;
            const nextBlock = latestBlocksAvailable[i + 1];
            expect(hash).to.eql(nextBlock.prevHash);
            expect(height).to.eql(nextBlock.height - 1);
        }

        // We get the reconsidered block
        const latestBlockAvailableByBlocks = await chronik.blocks(
            REGTEST_CHAIN_INIT_HEIGHT + 10,
            REGTEST_CHAIN_INIT_HEIGHT + 10,
        );

        // We get it in an array of length 1
        expect([blockFromHash.blockInfo]).to.deep.equal(
            latestBlockAvailableByBlocks,
        );
    });
});
